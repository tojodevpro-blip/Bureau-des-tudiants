import "server-only";

import type { AnnouncementStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { renderMarkdown } from "@/lib/sanitize";
import { notifyClassOrAll } from "@/server/services/notifications";

export type AnnouncementInput = {
  titre: string;
  contenu: string;
  categorie: string;
  imageUrl: string | null;
  cibleToutes: boolean;
  classes: string[];
  epingle: boolean;
  urgent: boolean;
  publieLe: Date | null;
  expireLe: Date | null;
  statut: AnnouncementStatus;
};

export async function publishDueAnnouncements() {
  const now = new Date();
  const due = await prisma.announcement.findMany({
    where: {
      statut: "BROUILLON",
      publieLe: { lte: now },
    },
    select: { id: true },
  });
  for (const item of due) {
    await prisma.announcement.update({
      where: { id: item.id },
      data: { statut: "PUBLIEE" },
    });
    await notifyAnnouncement(item.id);
  }

  await prisma.announcement.updateMany({
    where: { statut: "PUBLIEE", expireLe: { lte: now } },
    data: { statut: "ARCHIVEE", archivedAt: now },
  });
}

async function notifyAnnouncement(id: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) return;
  await notifyClassOrAll(
    { classes: announcement.classes, toutes: announcement.cibleToutes },
    {
      type: "ANNONCE",
      titre: announcement.urgent ? `Urgent : ${announcement.titre}` : announcement.titre,
      message: `${announcement.categorie} · Une nouvelle annonce du BDE est disponible.`,
      url: `/annonces/${announcement.id}`,
      dedupeKey: `annonce:${announcement.id}`,
    },
  );
}

export async function createAnnouncement(
  input: AnnouncementInput,
  authorId: string,
  ip: string,
) {
  const statut = input.statut;
  const publieLe =
    input.publieLe ?? (statut === "PUBLIEE" ? new Date() : null);
  const announcement = await prisma.announcement.create({
    data: {
      titre: input.titre,
      contenu: renderMarkdown(input.contenu),
      categorie: input.categorie,
      imageUrl: input.imageUrl,
      cibleToutes: input.cibleToutes,
      classes: input.cibleToutes ? [] : input.classes,
      epingle: input.epingle,
      urgent: input.urgent,
      statut,
      publieLe,
      expireLe: input.expireLe,
      createdById: authorId,
    },
  });
  await logAudit({
    acteur: authorId,
    userId: authorId,
    action: "ANNONCE_CREEE",
    details: { annonceId: announcement.id, statut },
    ip,
  });
  if (statut === "PUBLIEE" && (!publieLe || publieLe <= new Date())) {
    await notifyAnnouncement(announcement.id);
  }
  return announcement;
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput>,
  authorId: string,
  ip: string,
) {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Annonce introuvable.", "INTROUVABLE");

  const nextStatut = input.statut ?? existing.statut;
  const wasPublished = existing.statut === "PUBLIEE";
  const nextPublieLe =
    input.publieLe !== undefined ? input.publieLe : existing.publieLe;
  const shouldNotify =
    nextStatut === "PUBLIEE" &&
    (!wasPublished ||
      (nextPublieLe !== null && nextPublieLe <= new Date() && existing.publieLe?.getTime() !== nextPublieLe.getTime()));

  const announcement = await prisma.$transaction(async (tx) => {
    await tx.announcementRevision.create({
      data: {
        announcementId: id,
        titre: existing.titre,
        contenu: existing.contenu,
        modifiedById: authorId,
      },
    });
    return tx.announcement.update({
      where: { id },
      data: {
        ...(input.titre !== undefined ? { titre: input.titre } : {}),
        ...(input.contenu !== undefined ? { contenu: renderMarkdown(input.contenu) } : {}),
        ...(input.categorie !== undefined ? { categorie: input.categorie } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.cibleToutes !== undefined ? { cibleToutes: input.cibleToutes } : {}),
        ...(input.classes !== undefined
          ? { classes: input.cibleToutes ? [] : input.classes }
          : {}),
        ...(input.epingle !== undefined ? { epingle: input.epingle } : {}),
        ...(input.urgent !== undefined ? { urgent: input.urgent } : {}),
        ...(input.statut !== undefined ? { statut: input.statut } : {}),
        ...(input.publieLe !== undefined ? { publieLe: input.publieLe } : {}),
        ...(input.expireLe !== undefined ? { expireLe: input.expireLe } : {}),
        ...(nextStatut === "ARCHIVEE" ? { archivedAt: new Date() } : {}),
      },
    });
  });

  await logAudit({
    acteur: authorId,
    userId: authorId,
    action: "ANNONCE_MODIFIEE",
    details: { annonceId: id, statut: nextStatut },
    ip,
  });
  if (shouldNotify) await notifyAnnouncement(id);
  return announcement;
}

export async function archiveAnnouncement(id: string, actorId: string, ip: string) {
  const announcement = await prisma.announcement.update({
    where: { id },
    data: { statut: "ARCHIVEE", archivedAt: new Date() },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "ANNONCE_ARCHIVEE",
    details: { annonceId: id },
    ip,
  });
  return announcement;
}

export async function listAnnouncementsForAdmin(options: {
  page: number;
  pageSize: number;
  search?: string;
  statut?: AnnouncementStatus;
}) {
  const where: Prisma.AnnouncementWhereInput = {
    ...(options.statut ? { statut: options.statut } : {}),
    ...(options.search
      ? {
          OR: [
            { titre: { contains: options.search, mode: "insensitive" } },
            { categorie: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const skip = (options.page - 1) * options.pageSize;
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ epingle: "desc" }, { updatedAt: "desc" }],
      skip,
      take: options.pageSize,
      include: {
        createdBy: { select: { email: true } },
        _count: { select: { reads: true, revisions: true } },
      },
    }),
    prisma.announcement.count({ where }),
  ]);
  return { items, total };
}

export async function listAnnouncementsForStudent(
  userId: string,
  classe: string | null,
  options: {
    page: number;
    pageSize: number;
    search?: string;
    categorie?: string;
    unread?: boolean;
    allAudiences?: boolean;
  },
) {
  await publishDueAnnouncements();
  const now = new Date();
  const where: Prisma.AnnouncementWhereInput = {
    statut: "PUBLIEE",
    AND: [
      { OR: [{ publieLe: null }, { publieLe: { lte: now } }] },
      { OR: [{ expireLe: null }, { expireLe: { gt: now } }] },
      ...(options.allAudiences
        ? []
        : [{ OR: [{ cibleToutes: true }, ...(classe ? [{ classes: { has: classe } }] : [])] }]),
      ...(options.search
        ? [
            {
              OR: [
                { titre: { contains: options.search, mode: "insensitive" as const } },
                { contenu: { contains: options.search, mode: "insensitive" as const } },
              ],
            },
          ]
        : []),
      ...(options.categorie ? [{ categorie: options.categorie }] : []),
      ...(options.unread ? [{ reads: { none: { userId } } }] : []),
    ],
  };
  const skip = (options.page - 1) * options.pageSize;
  const [items, total, categories] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: [{ epingle: "desc" }, { urgent: "desc" }, { publieLe: "desc" }],
      skip,
      take: options.pageSize,
      include: { reads: { where: { userId }, select: { readAt: true } } },
    }),
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where: { statut: "PUBLIEE" },
      distinct: ["categorie"],
      select: { categorie: true },
      orderBy: { categorie: "asc" },
    }),
  ]);
  return { items, total, categories: categories.map((item) => item.categorie) };
}

export async function getAnnouncementForStudent(
  id: string,
  userId: string,
  classe: string | null,
  allAudiences = false,
) {
  await publishDueAnnouncements();
  const now = new Date();
  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      statut: "PUBLIEE",
      AND: [
        { OR: [{ publieLe: null }, { publieLe: { lte: now } }] },
        { OR: [{ expireLe: null }, { expireLe: { gt: now } }] },
        ...(allAudiences
          ? []
          : [{ OR: [{ cibleToutes: true }, ...(classe ? [{ classes: { has: classe } }] : [])] }]),
      ],
    },
    include: { reads: { where: { userId }, select: { readAt: true } } },
  });
  if (!announcement) throw new ApiError(404, "Annonce introuvable.", "INTROUVABLE");
  return announcement;
}

export async function getAnnouncementForAdmin(id: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      revisions: { orderBy: { createdAt: "desc" }, take: 20, include: { modifiedBy: { select: { email: true } } } },
      createdBy: { select: { email: true } },
    },
  });
  if (!announcement) throw new ApiError(404, "Annonce introuvable.", "INTROUVABLE");
  return announcement;
}

export async function markAnnouncementRead(id: string, userId: string) {
  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: id, userId } },
    create: { announcementId: id, userId },
    update: { readAt: new Date() },
  });
}

export async function unreadAnnouncementCount(userId: string, classe: string | null) {
  const now = new Date();
  return prisma.announcement.count({
    where: {
      statut: "PUBLIEE",
      AND: [
        { OR: [{ publieLe: null }, { publieLe: { lte: now } }] },
        { OR: [{ expireLe: null }, { expireLe: { gt: now } }] },
        { OR: [{ cibleToutes: true }, ...(classe ? [{ classes: { has: classe } }] : [])] },
        { reads: { none: { userId } } },
      ],
    },
  });
}
