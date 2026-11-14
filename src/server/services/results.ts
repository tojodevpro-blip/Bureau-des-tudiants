import "server-only";

import type { Candidate, Election, ElectionPosition } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CandidateResult = {
  candidate: Candidate;
  votes: number;
  pourcentage: number;
};

export type PositionResults = {
  position: ElectionPosition;
  classement: CandidateResult[];
  blancs: number;
  blancsPourcentage: number;
  totalVotes: number;
};

export type ElectionResults = {
  election: Election;
  positions: PositionResults[];
  classement: CandidateResult[];
  blancs: number;
  blancsPourcentage: number;
  totalVotes: number;
  votants: number;
  inscrits: number;
  totalEtudiants: number;
  participation: number;
  genereLe: Date;
};

export async function getElectionResults(electionId: string): Promise<ElectionResults | null> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      positions: { orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] },
      candidates: { orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!election) return null;

  const [grouped, groupedBlanks, votants, inscrits, totalEtudiants] = await Promise.all([
    prisma.ballot.groupBy({
      by: ["candidateId"],
      where: { electionId, candidateId: { not: null } },
      _count: { _all: true },
    }),
    prisma.ballot.groupBy({
      by: ["positionId"],
      where: { electionId, candidateId: null },
      _count: { _all: true },
    }),
    prisma.voteParticipation.count({ where: { electionId } }),
    prisma.user.count({
      where: { role: "STUDENT", statut: "APPROUVE", student: { actif: true } },
    }),
    prisma.student.count({ where: { actif: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const row of grouped) {
    if (row.candidateId) counts.set(row.candidateId, row._count._all);
  }

  const blankCounts = new Map<string | null, number>();
  for (const row of groupedBlanks) {
    blankCounts.set(row.positionId, row._count._all);
  }

  const candidateResult = (candidate: Candidate, total: number): CandidateResult => {
    const votes = counts.get(candidate.id) ?? 0;
    return {
      candidate,
      votes,
      pourcentage: total > 0 ? (votes / total) * 100 : 0,
    };
  };

  const positions: PositionResults[] = election.positions.map((position) => {
    const candidates = election.candidates.filter(
      (candidate) => candidate.positionId === position.id,
    );
    const blancs = blankCounts.get(position.id) ?? 0;
    const totalVotes =
      candidates.reduce((sum, candidate) => sum + (counts.get(candidate.id) ?? 0), 0) + blancs;
    return {
      position,
      classement: candidates
        .map((candidate) => candidateResult(candidate, totalVotes))
        .sort((a, b) => b.votes - a.votes || a.candidate.ordre - b.candidate.ordre),
      blancs,
      blancsPourcentage: totalVotes > 0 ? (blancs / totalVotes) * 100 : 0,
      totalVotes,
    };
  });

  const totalVotes = grouped.reduce((sum, row) => sum + row._count._all, 0) +
    groupedBlanks.reduce((sum, row) => sum + row._count._all, 0);
  const blancs = groupedBlanks.reduce((sum, row) => sum + row._count._all, 0);

  const classement: CandidateResult[] = election.candidates
    .map((candidate) => candidateResult(candidate, totalVotes))
    .sort((a, b) => b.votes - a.votes || a.candidate.ordre - b.candidate.ordre);

  return {
    election,
    positions,
    classement,
    blancs,
    blancsPourcentage: totalVotes > 0 ? (blancs / totalVotes) * 100 : 0,
    totalVotes,
    votants,
    inscrits,
    totalEtudiants,
    participation: inscrits > 0 ? (votants / inscrits) * 100 : 0,
    genereLe: new Date(),
  };
}

export async function getPublishedResults() {
  const election = await prisma.election.findFirst({
    where: { statut: "PUBLIEE" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!election) return null;
  return getElectionResults(election.id);
}
