import "server-only";

import type { ReportTarget } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function createReport(input: {
  reporterId: string;
  targetType: ReportTarget;
  targetId: string;
  motif: string;
  details?: string | null;
  ip?: string;
}) {
  const exists = await reportTargetExists(input.targetType, input.targetId);
  if (!exists) throw new ApiError(404, "Le contenu signalé n’existe plus.", "INTROUVABLE");

  const duplicate = await prisma.report.findFirst({
    where: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      statut: "EN_ATTENTE",
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(409, "Tu as déjà signalé ce contenu.", "SIGNALEMENT_EXISTANT");
  }

  const report = await prisma.report.create({
    data: {
      reporterId: input.reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      motif: input.motif.slice(0, 160),
      details: input.details?.slice(0, 2000) ?? null,
    },
  });

  await logAudit({
    acteur: input.reporterId,
    action: "SIGNALEMENT_CREE",
    details: { reportId: report.id, targetType: input.targetType },
    ip: input.ip,
  });
  return report;
}

async function reportTargetExists(type: ReportTarget, id: string) {
  switch (type) {
    case "ANNONCE":
      return Boolean(await prisma.announcement.findUnique({ where: { id }, select: { id: true } }));
    case "COMMENTAIRE":
      return Boolean(await prisma.comment.findUnique({ where: { id }, select: { id: true } }));
    case "MESSAGE":
      return Boolean(await prisma.message.findUnique({ where: { id }, select: { id: true } }));
    case "PHOTO":
      return Boolean(await prisma.albumMedia.findUnique({ where: { id }, select: { id: true } }));
    case "DEMANDE":
      return Boolean(await prisma.supportRequest.findUnique({ where: { id }, select: { id: true } }));
    case "EVENEMENT":
      return Boolean(await prisma.event.findUnique({ where: { id }, select: { id: true } }));
    default:
      return false;
  }
}

export async function listReports(options: {
  statut?: "EN_ATTENTE" | "TRAITEE" | "REJETEE";
  page: number;
  pageSize: number;
}) {
  const where = options.statut ? { statut: options.statut } : {};
  const skip = (options.page - 1) * options.pageSize;
  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
      skip,
      take: options.pageSize,
      include: {
        reporter: { select: { id: true, email: true, student: { select: { prenoms: true, nom: true } } } },
        handledBy: { select: { id: true, email: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);
  return { items, total };
}

export async function handleReport(input: {
  id: string;
  handledById: string;
  statut: "TRAITEE" | "REJETEE";
  resolution?: string | null;
  ip?: string;
}) {
  const report = await prisma.report.update({
    where: { id: input.id },
    data: {
      statut: input.statut,
      handledById: input.handledById,
      resolution: input.resolution?.slice(0, 1000) ?? null,
    },
  });
  await logAudit({
    acteur: input.handledById,
    action: "SIGNALEMENT_TRAITE",
    details: { reportId: report.id, statut: report.statut },
    ip: input.ip,
  });
  return report;
}

export async function pendingReportCount() {
  return prisma.report.count({ where: { statut: "EN_ATTENTE" } });
}
