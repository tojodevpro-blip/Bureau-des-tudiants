import "server-only";

import { Prisma, type ElectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { canTransition } from "@/lib/election-status";
import { logAudit } from "@/lib/audit";
import type { z } from "zod";
import type {
  candidateSchema,
  candidateUpdateSchema,
  electionCreateSchema,
  electionUpdateSchema,
  positionSchema,
} from "@/lib/validation";

type ElectionCreateInput = z.infer<typeof electionCreateSchema>;
type ElectionUpdateInput = z.infer<typeof electionUpdateSchema>;
type CandidateInput = z.infer<typeof candidateSchema>;
type CandidateUpdateInput = z.infer<typeof candidateUpdateSchema>;
type PositionInput = z.infer<typeof positionSchema>;

function assertDates(ouvreLe: Date | null, fermeLe: Date | null) {
  if (ouvreLe && fermeLe && fermeLe.getTime() <= ouvreLe.getTime()) {
    throw new ApiError(
      400,
      "La date de fermeture doit être postérieure à la date d’ouverture.",
      "DATES_INVALIDES",
    );
  }
}

export async function listElections() {
  const elections = await prisma.election.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      _count: { select: { candidates: true, participations: true } },
    },
  });
  return elections;
}

export async function getCurrentElection() {
  const open = await prisma.election.findFirst({
    where: { statut: "OUVERTE" },
    orderBy: { updatedAt: "desc" },
  });
  if (open) return open;
  return prisma.election.findFirst({
    where: { statut: { in: ["CANDIDATURES", "CLOTUREE", "PUBLIEE"] } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getElectionDetail(id: string) {
  return prisma.election.findUnique({
    where: { id },
    include: {
      positions: { orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] },
      candidates: {
        orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
        include: { student: { select: { matricule: true, classe: true } } },
      },
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          position: { select: { id: true, titre: true } },
          student: { select: { nom: true, prenoms: true, matricule: true, classe: true } },
        },
      },
      _count: { select: { participations: true, ballots: true } },
    },
  });
}

export async function createElection(
  input: ElectionCreateInput,
  acteur: string,
  ip: string,
) {
  assertDates(input.ouvreLe, input.fermeLe);
  const election = await prisma.election.create({
    data: {
      titre: input.titre.trim(),
      description: input.description?.trim() || null,
      statut: "BROUILLON",
      ouvreLe: input.ouvreLe,
      fermeLe: input.fermeLe,
    },
  });
  await logAudit({
    acteur,
    action: "ELECTION_CREEE",
    details: { electionId: election.id, titre: election.titre },
    ip,
  });
  return election;
}

export async function updateElection(
  id: string,
  input: ElectionUpdateInput,
  acteur: string,
  ip: string,
) {
  const election = await prisma.election.findUnique({ where: { id } });
  if (!election) throw new ApiError(404, "Élection introuvable.", "ELECTION_INTROUVABLE");
  if (["OUVERTE", "CLOTUREE", "PUBLIEE"].includes(election.statut)) {
    throw new ApiError(
      409,
      "Cette élection ne peut plus être modifiée après l’ouverture du vote.",
      "ELECTION_VERROUILLEE",
    );
  }

  const ouvreLe = input.ouvreLe !== undefined ? input.ouvreLe : election.ouvreLe;
  const fermeLe = input.fermeLe !== undefined ? input.fermeLe : election.fermeLe;
  assertDates(ouvreLe, fermeLe);

  const updated = await prisma.election.update({
    where: { id },
    data: {
      titre: input.titre !== undefined ? input.titre.trim() : undefined,
      description:
        input.description !== undefined ? input.description?.trim() || null : undefined,
      ouvreLe: input.ouvreLe !== undefined ? input.ouvreLe : undefined,
      fermeLe: input.fermeLe !== undefined ? input.fermeLe : undefined,
    },
  });

  await logAudit({
    acteur,
    action: "ELECTION_MODIFIEE",
    details: { electionId: id },
    ip,
  });
  return updated;
}

async function assertCandidatesEditable(electionId: string) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { statut: true },
  });
  if (!election) throw new ApiError(404, "Élection introuvable.", "ELECTION_INTROUVABLE");
  if (!["BROUILLON", "CANDIDATURES"].includes(election.statut)) {
    throw new ApiError(
      409,
      "Les candidats ne peuvent plus être modifiés après l’ouverture du vote.",
      "ELECTION_VERROUILLEE",
    );
  }
}

async function assertStudentExists(studentId: string | null | undefined) {
  if (!studentId) return null;
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new ApiError(400, "Étudiant introuvable.", "ETUDIANT_INTROUVABLE");
  return student;
}

async function assertPositionBelongs(
  electionId: string,
  positionId: string | null | undefined,
) {
  if (!positionId) return null;
  const position = await prisma.electionPosition.findFirst({
    where: { id: positionId, electionId },
    select: { id: true },
  });
  if (!position) throw new ApiError(400, "Poste invalide pour cette élection.", "POSTE_INVALIDE");
  return position;
}

export async function createPosition(
  electionId: string,
  input: PositionInput,
  acteur: string,
  ip: string,
) {
  await assertCandidatesEditable(electionId);
  const max = await prisma.electionPosition.aggregate({
    where: { electionId },
    _max: { ordre: true },
  });
  const position = await prisma.electionPosition.create({
    data: {
      electionId,
      titre: input.titre.trim(),
      description: input.description?.trim() || null,
      ordre: input.ordre ?? (max._max.ordre ?? 0) + 1,
    },
  });
  await logAudit({
    acteur,
    action: "POSTE_AJOUTE",
    details: { electionId, positionId: position.id },
    ip,
  });
  return position;
}

export async function updatePosition(
  positionId: string,
  input: Partial<PositionInput>,
  acteur: string,
  ip: string,
) {
  const existing = await prisma.electionPosition.findUnique({ where: { id: positionId } });
  if (!existing) throw new ApiError(404, "Poste introuvable.", "POSTE_INTROUVABLE");
  await assertCandidatesEditable(existing.electionId);
  const position = await prisma.electionPosition.update({
    where: { id: positionId },
    data: {
      titre: input.titre?.trim(),
      description:
        input.description !== undefined ? input.description?.trim() || null : undefined,
      ordre: input.ordre,
    },
  });
  await logAudit({
    acteur,
    action: "POSTE_MODIFIE",
    details: { electionId: existing.electionId, positionId },
    ip,
  });
  return position;
}

export async function deletePosition(positionId: string, acteur: string, ip: string) {
  const existing = await prisma.electionPosition.findUnique({
    where: { id: positionId },
    include: { _count: { select: { candidates: true, applications: true } } },
  });
  if (!existing) throw new ApiError(404, "Poste introuvable.", "POSTE_INTROUVABLE");
  await assertCandidatesEditable(existing.electionId);
  if (existing._count.candidates > 0 || existing._count.applications > 0) {
    throw new ApiError(
      409,
      "Ce poste contient des candidats ou des candidatures : suppression impossible.",
      "POSTE_UTILISE",
    );
  }
  await prisma.electionPosition.delete({ where: { id: positionId } });
  await logAudit({
    acteur,
    action: "POSTE_SUPPRIME",
    details: { electionId: existing.electionId, positionId },
    ip,
  });
}

export async function createCandidate(
  electionId: string,
  input: CandidateInput,
  acteur: string,
  ip: string,
) {
  await assertCandidatesEditable(electionId);
  await assertStudentExists(input.studentId);
  await assertPositionBelongs(electionId, input.positionId);
  const positionCount = await prisma.electionPosition.count({ where: { electionId } });
  if (positionCount > 0 && !input.positionId) {
    throw new ApiError(400, "Choisis le poste du candidat.", "POSTE_REQUIS");
  }

  const max = await prisma.candidate.aggregate({
    where: { electionId, positionId: input.positionId || null },
    _max: { ordre: true },
  });
  const ordre = input.ordre ?? (max._max.ordre ?? 0) + 1;

  const candidate = await prisma.candidate.create({
    data: {
      electionId,
      positionId: input.positionId || null,
      studentId: input.studentId || null,
      nomAffiche: input.nomAffiche.trim(),
      photoUrl: input.photoUrl,
      slogan: input.slogan?.trim() || null,
      programme: input.programme?.trim() || null,
      ordre,
    },
  });

  await logAudit({
    acteur,
    action: "CANDIDAT_AJOUTE",
    details: { electionId, candidateId: candidate.id, ordre },
    ip,
  });
  return candidate;
}

export async function updateCandidate(
  candidateId: string,
  input: CandidateUpdateInput,
  acteur: string,
  ip: string,
) {
  const existing = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!existing) throw new ApiError(404, "Candidat introuvable.", "CANDIDAT_INTROUVABLE");
  await assertCandidatesEditable(existing.electionId);
  if (input.studentId !== undefined) await assertStudentExists(input.studentId);
  if (input.positionId !== undefined) {
    await assertPositionBelongs(existing.electionId, input.positionId);
    const positionCount = await prisma.electionPosition.count({
      where: { electionId: existing.electionId },
    });
    if (positionCount > 0 && !input.positionId) {
      throw new ApiError(400, "Choisis le poste du candidat.", "POSTE_REQUIS");
    }
  }

  const candidate = await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      positionId: input.positionId !== undefined ? input.positionId || null : undefined,
      nomAffiche: input.nomAffiche?.trim(),
      photoUrl: input.photoUrl !== undefined ? input.photoUrl : undefined,
      slogan: input.slogan !== undefined ? input.slogan?.trim() || null : undefined,
      programme:
        input.programme !== undefined ? input.programme?.trim() || null : undefined,
      ordre: input.ordre,
      studentId: input.studentId !== undefined ? input.studentId || null : undefined,
    },
  });

  await logAudit({
    acteur,
    action: "CANDIDAT_MODIFIE",
    details: { electionId: existing.electionId, candidateId },
    ip,
  });
  return candidate;
}

export async function deleteCandidate(candidateId: string, acteur: string, ip: string) {
  const existing = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { _count: { select: { ballots: true } } },
  });
  if (!existing) throw new ApiError(404, "Candidat introuvable.", "CANDIDAT_INTROUVABLE");
  await assertCandidatesEditable(existing.electionId);
  if (existing._count.ballots > 0) {
    throw new ApiError(
      409,
      "Ce candidat a déjà reçu des votes : suppression impossible.",
      "CANDIDAT_A_DES_VOTES",
    );
  }

  await prisma.candidate.delete({ where: { id: candidateId } });
  await logAudit({
    acteur,
    action: "CANDIDAT_SUPPRIME",
    details: { electionId: existing.electionId, candidateId },
    ip,
  });
}

export async function transitionElection(
  electionId: string,
  target: ElectionStatus,
  acteur: string,
  ip: string,
) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      positions: {
        orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { candidates: true } } },
      },
      candidates: { select: { positionId: true } },
      _count: { select: { candidates: true } },
    },
  });
  if (!election) throw new ApiError(404, "Élection introuvable.", "ELECTION_INTROUVABLE");
  if (election.statut === target) return election;
  if (!canTransition(election.statut, target)) {
    throw new ApiError(
      409,
      `Transition impossible de « ${election.statut} » vers « ${target} ».`,
      "TRANSITION_INVALIDE",
    );
  }

  const now = new Date();
  let fermeLe = election.fermeLe;

  if (target === "OUVERTE") {
    if (election._count.candidates < 2) {
      throw new ApiError(
        409,
        "Ajoute au moins deux candidats avant d’ouvrir le vote.",
        "CANDIDATS_INSUFFISANTS",
      );
    }
    if (election.positions.length > 0) {
      const empty = election.positions.find((position) => position._count.candidates < 1);
      if (empty) {
        throw new ApiError(
          409,
          `Le poste « ${empty.titre} » ne contient aucun candidat.`,
          "POSTE_SANS_CANDIDAT",
        );
      }
      if (election.candidates.some((candidate) => !candidate.positionId)) {
        throw new ApiError(
          409,
          "Tous les candidats doivent être rattachés à un poste avant l’ouverture.",
          "CANDIDAT_SANS_POSTE",
        );
      }
    }
    if (!election.ouvreLe || !election.fermeLe) {
      throw new ApiError(
        409,
        "Définis la fenêtre d’ouverture et de fermeture avant d’ouvrir le vote.",
        "FENETRE_MANQUANTE",
      );
    }
    if (now < election.ouvreLe) {
      throw new ApiError(
        409,
        "La date d’ouverture est dans le futur. Modifie la fenêtre ou attends l’heure prévue.",
        "FENETRE_FUTURE",
      );
    }
    if (now > election.fermeLe) {
      throw new ApiError(
        409,
        "La date de fermeture est déjà passée. Modifie la fenêtre avant d’ouvrir.",
        "FENETRE_PASSEE",
      );
    }
    const otherOpen = await prisma.election.findFirst({
      where: { statut: "OUVERTE", id: { not: electionId } },
      select: { id: true, titre: true },
    });
    if (otherOpen) {
      throw new ApiError(
        409,
        `Une autre élection est déjà ouverte : « ${otherOpen.titre} ».`,
        "AUTRE_ELECTION_OUVERTE",
      );
    }
  }

  if (target === "CLOTUREE") {
    fermeLe =
      election.fermeLe && election.fermeLe.getTime() < now.getTime()
        ? election.fermeLe
        : now;
  }

  const updated = await prisma.election.update({
    where: { id: electionId },
    data: { statut: target, fermeLe },
  });

  await logAudit({
    acteur,
    action:
      target === "OUVERTE"
        ? "ELECTION_OUVERTE"
        : target === "CLOTUREE"
          ? "ELECTION_CLOTUREE"
          : target === "PUBLIEE"
            ? "ELECTION_PUBLIEE"
            : "ELECTION_STATUT_MODIFIE",
    details: { electionId, de: election.statut, vers: target },
    ip,
  });

  return updated;
}

export async function getElectionsForAdminDashboard() {
  const [total, brouillons, candidatesCount, open] = await Promise.all([
    prisma.election.count(),
    prisma.election.count({ where: { statut: { in: ["BROUILLON", "CANDIDATURES"] } } }),
    prisma.candidate.count({
      where: { election: { statut: { in: ["BROUILLON", "CANDIDATURES"] } } },
    }),
    prisma.election.findFirst({ where: { statut: "OUVERTE" } }),
  ]);
  return { total, brouillons, candidatesCount, open };
}

export function electionInclude() {
  return {
    candidates: {
      orderBy: [{ ordre: "asc" as const }, { createdAt: "asc" as const }],
    },
  } satisfies Prisma.ElectionInclude;
}
