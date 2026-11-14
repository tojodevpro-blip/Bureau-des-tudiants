import "server-only";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function reorderCandidates(
  electionId: string,
  orderedIds: string[],
  acteur: string,
  ip: string,
) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { statut: true },
  });
  if (!election) throw new ApiError(404, "Élection introuvable.", "ELECTION_INTROUVABLE");
  if (!["BROUILLON", "CANDIDATURES"].includes(election.statut)) {
    throw new ApiError(
      409,
      "Les candidats ne peuvent plus être réordonnés après l’ouverture du vote.",
      "ELECTION_VERROUILLEE",
    );
  }

  const candidates = await prisma.candidate.findMany({
    where: { electionId },
    select: { id: true },
  });
  const existingIds = new Set(candidates.map((candidate) => candidate.id));
  if (
    orderedIds.length !== candidates.length ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    throw new ApiError(400, "Liste de candidats invalide.", "ORDRE_INVALIDE");
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.candidate.update({ where: { id }, data: { ordre: index + 1 } }),
    ),
  );

  await logAudit({
    acteur,
    action: "CANDIDATS_REORDONNES",
    details: { electionId, ordre: orderedIds },
    ip,
  });

  return { ok: true };
}
