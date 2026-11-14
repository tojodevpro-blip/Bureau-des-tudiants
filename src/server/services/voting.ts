import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { isVoteWindowOpen } from "@/lib/election-status";
import { isApprovedStudent, type CurrentUser } from "@/lib/auth/session";
import { startOfUtcDay } from "@/lib/utils";
import { consumeAttempt, rateLimitKey } from "@/lib/rate-limit";

export class AlreadyVotedError extends Error {
  votedAt: Date;

  constructor(votedAt: Date) {
    super("Ton vote a déjà été enregistré.");
    this.name = "AlreadyVotedError";
    this.votedAt = votedAt;
  }
}

type VoteChoice = {
  positionId: string;
  candidateId: string | null;
};

type CastVoteInput = {
  user: CurrentUser;
  electionId: string;
  candidateId?: string | null;
  choices?: VoteChoice[];
  ip: string;
};

export async function castVote({
  user,
  electionId,
  candidateId,
  choices,
  ip,
}: CastVoteInput) {
  // Limite élevée pour ne pas bloquer un réseau partagé (campus, NAT),
  // tout en freinant les scripts.
  await consumeAttempt(rateLimitKey("vote:ip", ip), 300, 60 * 1000);

  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const election = await tx.election.findUnique({
        where: { id: electionId },
        include: {
          positions: { select: { id: true } },
          candidates: { select: { id: true, positionId: true } },
        },
      });
      if (!election) {
        throw new ApiError(404, "Cette élection n’existe pas.", "ELECTION_INTROUVABLE");
      }

      if (election.statut === "CLOTUREE" || election.statut === "PUBLIEE") {
        throw new ApiError(403, "Le scrutin est terminé.", "VOTE_FERME");
      }

      if (!isVoteWindowOpen(election, now)) {
        throw new ApiError(
          403,
          "Le vote n’est pas ouvert actuellement. Vérifie les horaires.",
          "VOTE_FERME",
        );
      }

      const freshUser = await tx.user.findUnique({
        where: { id: user.id },
        include: { student: true },
      });

      if (!freshUser || !isApprovedStudent(freshUser)) {
        throw new ApiError(
          403,
          "Ton compte n’est pas autorisé à voter.",
          "COMPTE_NON_AUTORISE",
        );
      }

      let ballots: { positionId: string | null; candidateId: string | null }[];

      if (election.positions.length > 0) {
        if (!choices?.length) {
          throw new ApiError(
            400,
            "Ce scrutin comporte plusieurs postes : un choix est requis pour chaque poste.",
            "CHOIX_POSTES_REQUIS",
          );
        }
        if (choices.length !== election.positions.length) {
          throw new ApiError(
            400,
            "Le bulletin doit contenir un choix pour chaque poste.",
            "CHOIX_POSTES_INCOMPLETS",
          );
        }
        const positionIds = new Set(election.positions.map((position) => position.id));
        const seen = new Set<string>();
        ballots = choices.map((choice) => {
          if (!positionIds.has(choice.positionId)) {
            throw new ApiError(400, "Poste invalide pour cette élection.", "POSTE_INVALIDE");
          }
          if (seen.has(choice.positionId)) {
            throw new ApiError(400, "Un seul choix est autorisé par poste.", "POSTE_DUPLIQUE");
          }
          seen.add(choice.positionId);

          if (choice.candidateId) {
            const candidate = election.candidates.find(
              (item) =>
                item.id === choice.candidateId && item.positionId === choice.positionId,
            );
            if (!candidate) {
              throw new ApiError(
                400,
                "Candidat invalide pour ce poste.",
                "CANDIDAT_INVALIDE",
              );
            }
          }
          return { positionId: choice.positionId, candidateId: choice.candidateId ?? null };
        });
      } else {
        if (candidateId === undefined) {
          throw new ApiError(
            400,
            "Choisis un candidat ou un vote blanc.",
            "CHOIX_MANQUANT",
          );
        }
        if (candidateId) {
          const candidate = election.candidates.find((item) => item.id === candidateId);
          if (!candidate) {
            throw new ApiError(400, "Candidat invalide pour cette élection.", "CANDIDAT_INVALIDE");
          }
        }
        ballots = [{ positionId: null, candidateId: candidateId ?? null }];
      }

      const existing = await tx.voteParticipation.findUnique({
        where: {
          electionId_userId: { electionId, userId: freshUser.id },
        },
      });
      if (existing) throw new AlreadyVotedError(existing.createdAt);

      const participation = await tx.voteParticipation.create({
        data: { electionId, userId: freshUser.id },
      });

      await tx.ballot.createMany({
        data: ballots.map((ballot) => ({
          electionId,
          positionId: ballot.positionId,
          candidateId: ballot.candidateId,
          dateVote: startOfUtcDay(now),
        })),
      });

      // Journalisation sans le choix de vote.
      await tx.auditLog.create({
        data: {
          acteur: freshUser.id,
          action: "VOTE_ENREGISTRE",
          details: { electionId, postes: ballots.length },
          ip,
        },
      });

      return { votedAt: participation.createdAt };
    });

    return result;
  } catch (error) {
    if (error instanceof AlreadyVotedError) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const participation = await prisma.voteParticipation.findUnique({
        where: { electionId_userId: { electionId, userId: user.id } },
        select: { createdAt: true },
      });
      throw new AlreadyVotedError(participation?.createdAt ?? now);
    }

    throw error;
  }
}

export async function getParticipation(electionId: string) {
  const [votants, inscrits, totalEtudiants] = await Promise.all([
    prisma.voteParticipation.count({ where: { electionId } }),
    prisma.user.count({
      where: { role: "STUDENT", statut: "APPROUVE", student: { actif: true } },
    }),
    prisma.student.count({ where: { actif: true } }),
  ]);

  return {
    votants,
    inscrits,
    totalEtudiants,
    taux: inscrits > 0 ? (votants / inscrits) * 100 : 0,
  };
}

export async function getUserVoteStatus(electionId: string, userId: string) {
  const participation = await prisma.voteParticipation.findUnique({
    where: { electionId_userId: { electionId, userId } },
    select: { createdAt: true },
  });
  return participation;
}
