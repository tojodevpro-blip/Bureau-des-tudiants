import "server-only";

import type { PollStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { notifyClassOrAll } from "@/server/services/notifications";

export async function createPoll(
  input: {
    question: string;
    description?: string | null;
    multiple: boolean;
    anonyme: boolean;
    resultatsMode: "IMMEDIAT" | "APRES_CLOTURE";
    closesAt: Date | null;
    audienceToutes: boolean;
    classes: string[];
    options: string[];
  },
  actorId: string,
  ip: string,
) {
  const options = [...new Set(input.options.map((label) => label.trim()).filter(Boolean))];
  if (options.length < 2) throw new ApiError(400, "Ajoute au moins deux options distinctes.", "VALIDATION");
  const poll = await prisma.poll.create({
    data: {
      question: input.question,
      description: input.description ?? null,
      multiple: input.multiple,
      anonyme: input.anonyme,
      resultatsMode: input.resultatsMode,
      closesAt: input.closesAt,
      audienceToutes: input.audienceToutes,
      classes: input.audienceToutes ? [] : input.classes,
      createdById: actorId,
      options: { create: options.map((label, index) => ({ label, ordre: index })) },
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "SONDAGE_CREE",
    details: { sondageId: poll.id },
    ip,
  });
  return poll;
}

export async function updatePollStatus(
  id: string,
  statut: PollStatus,
  actorId: string,
  ip: string,
) {
  const poll = await prisma.poll.findUnique({ where: { id }, include: { options: true } });
  if (!poll) throw new ApiError(404, "Sondage introuvable.", "INTROUVABLE");
  if (statut === "OUVERT" && poll.options.length < 2) {
    throw new ApiError(400, "Deux options minimum sont nécessaires.", "VALIDATION");
  }
  const updated = await prisma.poll.update({ where: { id }, data: { statut } });
  if (statut === "OUVERT") {
    await notifyClassOrAll(
      { classes: poll.classes, toutes: poll.audienceToutes },
      {
        type: "SONDAGE",
        titre: "Nouveau sondage du BDE",
        message: poll.question,
        url: `/sondages/${poll.id}`,
        dedupeKey: `sondage:${poll.id}`,
      },
    );
  }
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: statut === "OUVERT" ? "SONDAGE_OUVERT" : "SONDAGE_CLOTURE",
    details: { sondageId: id },
    ip,
  });
  return updated;
}

export async function closeExpiredPolls() {
  await prisma.poll.updateMany({
    where: { statut: "OUVERT", closesAt: { lte: new Date() } },
    data: { statut: "CLOTURE" },
  });
}

export async function listPollsForUser(user: { id: string; classe: string | null }) {
  await closeExpiredPolls();
  const polls = await prisma.poll.findMany({
    where: {
      statut: { in: ["OUVERT", "CLOTURE"] },
      AND: [
        { OR: [{ audienceToutes: true }, ...(user.classe ? [{ classes: { has: user.classe } }] : [])] },
      ],
    },
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
    include: {
      options: { orderBy: { ordre: "asc" } },
      participations: { where: { userId: user.id }, select: { id: true, createdAt: true } },
      _count: { select: { participations: true } },
    },
  });
  return polls;
}

export async function getPollForUser(id: string, user: { id: string; classe: string | null }) {
  await closeExpiredPolls();
  const poll = await prisma.poll.findFirst({
    where: {
      id,
      statut: { in: ["OUVERT", "CLOTURE"] },
      AND: [
        { OR: [{ audienceToutes: true }, ...(user.classe ? [{ classes: { has: user.classe } }] : [])] },
      ],
    },
    include: {
      options: {
        orderBy: { ordre: "asc" },
        include: { _count: { select: { ballots: true } } },
      },
      participations: { where: { userId: user.id }, select: { createdAt: true } },
      _count: { select: { participations: true } },
    },
  });
  if (!poll) throw new ApiError(404, "Sondage introuvable.", "INTROUVABLE");
  return poll;
}

export async function votePoll(input: {
  pollId: string;
  userId: string;
  studentId: string | null;
  classe: string | null;
  optionIds: string[];
  ip: string;
}) {
  await closeExpiredPolls();
  const poll = await prisma.poll.findUnique({
    where: { id: input.pollId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) throw new ApiError(404, "Sondage introuvable.", "INTROUVABLE");
  if (poll.statut !== "OUVERT") throw new ApiError(400, "Le sondage est fermé.", "SONDAGE_FERME");
  if (poll.closesAt && poll.closesAt <= new Date()) {
    throw new ApiError(400, "Le sondage est fermé.", "SONDAGE_FERME");
  }
  if (!poll.audienceToutes && (!input.classe || !poll.classes.includes(input.classe))) {
    throw new ApiError(403, "Ce sondage ne concerne pas ta classe.", "ACCES_REFUSE");
  }
  const validIds = new Set(poll.options.map((option) => option.id));
  const chosen = [...new Set(input.optionIds)];
  if (chosen.some((id) => !validIds.has(id))) {
    throw new ApiError(400, "Option invalide.", "VALIDATION");
  }
  if (!poll.multiple && chosen.length !== 1) {
    throw new ApiError(400, "Choisis une seule option.", "VALIDATION");
  }
  if (poll.multiple && chosen.length < 1) {
    throw new ApiError(400, "Choisis au moins une option.", "VALIDATION");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.pollParticipation.findUnique({
      where: { pollId_userId: { pollId: poll.id, userId: input.userId } },
    });
    if (existing) throw new ApiError(409, "Tu as déjà participé à ce sondage.", "DEJA_VOTE");
    await tx.pollParticipation.create({
      data: { pollId: poll.id, userId: input.userId, studentId: input.studentId },
    });
    await tx.pollBallot.createMany({
      data: chosen.map((optionId) => ({ pollId: poll.id, optionId })),
    });
  });

  await logAudit({
    acteur: input.userId,
    userId: input.userId,
    action: "SONDAGE_PARTICIPATION",
    details: { sondageId: poll.id },
    ip: input.ip,
  });
}

export async function listPollsForAdmin(options: { page: number; pageSize: number }) {
  await closeExpiredPolls();
  const skip = (options.page - 1) * options.pageSize;
  const [items, total] = await Promise.all([
    prisma.poll.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: options.pageSize,
      include: {
        options: { orderBy: { ordre: "asc" }, include: { _count: { select: { ballots: true } } } },
        _count: { select: { participations: true } },
      },
    }),
    prisma.poll.count(),
  ]);
  return { items, total };
}

export async function getPollForAdmin(id: string) {
  await closeExpiredPolls();
  const poll = await prisma.poll.findUnique({
    where: { id },
    include: {
      options: { orderBy: { ordre: "asc" }, include: { _count: { select: { ballots: true } } } },
      _count: { select: { participations: true } },
    },
  });
  if (!poll) throw new ApiError(404, "Sondage introuvable.", "INTROUVABLE");
  return poll;
}

export function canSeeResults(
  poll: { resultatsMode: "IMMEDIAT" | "APRES_CLOTURE"; statut: PollStatus },
  hasVoted: boolean,
) {
  if (poll.resultatsMode === "IMMEDIAT") return hasVoted;
  return poll.statut === "CLOTURE";
}
