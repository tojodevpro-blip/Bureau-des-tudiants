import "server-only";

import type { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";
import { createNotification, notifyUsers } from "@/server/services/notifications";

const REOPEN_DAYS = 7;

export function requestNumber(numero: number) {
  return `#${String(numero).padStart(5, "0")}`;
}

export async function createSupportRequest(
  input: { categorie: string; sujet: string; message: string; anonyme: boolean },
  user: { id: string; studentId: string | null },
  ip: string,
) {
  const request = await prisma.supportRequest.create({
    data: {
      userId: user.id,
      studentId: user.studentId,
      categorie: input.categorie,
      sujet: input.sujet,
      message: sanitizePlainText(input.message, 5000),
      anonyme: input.anonyme,
    },
  });

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MEMBRE_BDE"] }, statut: "APPROUVE" },
    select: { id: true },
  });
  await notifyUsers(
    staff.map((member) => member.id),
    {
      type: "DEMANDE",
      titre: `Nouvelle demande ${requestNumber(request.numero)}`,
      message: `${request.categorie} · ${request.sujet}`,
      url: `/admin/demandes/${request.id}`,
      dedupeKey: `demande-staff:${request.id}`,
    },
  );
  await logAudit({
    acteur: user.id,
    userId: user.id,
    action: "DEMANDE_CREEE",
    details: { demandeId: request.id, numero: request.numero },
    ip,
  });
  return request;
}

export async function listMyRequests(userId: string) {
  return prisma.supportRequest.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { replies: true } },
      replies: {
        where: { interne: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, authorId: true },
      },
    },
  });
}

export async function getRequestForStudent(id: string, userId: string) {
  const request = await prisma.supportRequest.findUnique({
    where: { id },
    include: {
      replies: {
        where: { interne: false },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              role: true,
              student: { select: { prenoms: true, nom: true } },
            },
          },
        },
      },
      assignedTo: { select: { email: true } },
    },
  });
  if (!request || request.userId !== userId) {
    throw new ApiError(404, "Demande introuvable.", "INTROUVABLE");
  }
  return request;
}

export async function getRequestForStaff(id: string) {
  const request = await prisma.supportRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          email: true,
          telephone: true,
          student: { select: { matricule: true, prenoms: true, nom: true, classe: true } },
        },
      },
      student: { select: { matricule: true, prenoms: true, nom: true, classe: true } },
      assignedTo: { select: { id: true, email: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { email: true, role: true } },
        },
      },
    },
  });
  if (!request) throw new ApiError(404, "Demande introuvable.", "INTROUVABLE");
  return request;
}

export async function listRequestsForStaff(options: {
  page: number;
  pageSize: number;
  statut?: RequestStatus;
  search?: string;
}) {
  const where = {
    ...(options.statut ? { statut: options.statut } : {}),
    ...(options.search
      ? {
          OR: [
            { sujet: { contains: options.search, mode: "insensitive" as const } },
            { categorie: { contains: options.search, mode: "insensitive" as const } },
            { user: { email: { contains: options.search, mode: "insensitive" as const } } },
            { student: { matricule: { contains: options.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const skip = (options.page - 1) * options.pageSize;
  const [items, total, counts] = await Promise.all([
    prisma.supportRequest.findMany({
      where,
      orderBy: [{ statut: "asc" }, { updatedAt: "desc" }],
      skip,
      take: options.pageSize,
      include: {
        user: { select: { email: true } },
        student: { select: { matricule: true, prenoms: true, nom: true, classe: true } },
        assignedTo: { select: { email: true } },
        _count: { select: { replies: true } },
      },
    }),
    prisma.supportRequest.count({ where }),
    prisma.supportRequest.groupBy({ by: ["statut"], _count: { _all: true } }),
  ]);
  return { items, total, counts };
}

export async function addReply(input: {
  requestId: string;
  authorId: string;
  authorRole: "STUDENT" | "MEMBRE_BDE" | "ADMIN";
  contenu: string;
  interne: boolean;
  ip: string;
}) {
  const request = await prisma.supportRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, userId: true, numero: true, statut: true, sujet: true },
  });
  if (!request) throw new ApiError(404, "Demande introuvable.", "INTROUVABLE");

  const staff = input.authorRole !== "STUDENT";
  if (!staff && request.userId !== input.authorId) {
    throw new ApiError(403, "Accès refusé.", "ACCES_REFUSE");
  }
  if (!staff && request.statut === "FERMEE") {
    throw new ApiError(400, "Cette demande est fermée.", "DEMANDE_FERMEE");
  }
  if (!staff && input.interne) {
    throw new ApiError(403, "Accès refusé.", "ACCES_REFUSE");
  }

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.supportReply.create({
      data: {
        requestId: input.requestId,
        authorId: input.authorId,
        contenu: sanitizePlainText(input.contenu, 5000),
        interne: staff ? input.interne : false,
      },
    });
    await tx.supportRequest.update({
      where: { id: input.requestId },
      data: {
        lastReplyAt: new Date(),
        ...(staff && !input.interne && request.statut === "OUVERTE"
          ? { statut: "EN_COURS" as RequestStatus }
          : {}),
      },
    });
    return created;
  });

  if (staff && !input.interne) {
    await createNotification({
      userId: request.userId,
      type: "DEMANDE",
      titre: `Réponse à ta demande ${requestNumber(request.numero)}`,
      message: request.sujet,
      url: `/demandes/${request.id}`,
      dedupeKey: `demande-reponse:${reply.id}`,
    });
  } else if (!staff) {
    const staffUsers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MEMBRE_BDE"] }, statut: "APPROUVE" },
      select: { id: true },
    });
    await notifyUsers(
      staffUsers.map((member) => member.id),
      {
        type: "DEMANDE",
        titre: `Nouveau message ${requestNumber(request.numero)}`,
        message: request.sujet,
        url: `/admin/demandes/${request.id}`,
        dedupeKey: `demande-message:${reply.id}`,
      },
    );
  }

  await logAudit({
    acteur: input.authorId,
    userId: input.authorId,
    action: "DEMANDE_REPONSE",
    details: { demandeId: input.requestId, interne: input.interne },
    ip: input.ip,
  });
  return reply;
}

export async function updateRequestStatus(input: {
  requestId: string;
  actorId: string;
  actorRole: "STUDENT" | "MEMBRE_BDE" | "ADMIN";
  statut: RequestStatus;
  ip: string;
}) {
  const request = await prisma.supportRequest.findUnique({
    where: { id: input.requestId },
    include: { user: { select: { email: true } } },
  });
  if (!request) throw new ApiError(404, "Demande introuvable.", "INTROUVABLE");

  const staff = input.actorRole !== "STUDENT";
  if (!staff) {
    if (request.userId !== input.actorId) throw new ApiError(403, "Accès refusé.", "ACCES_REFUSE");
    if (input.statut !== "OUVERTE") throw new ApiError(403, "Accès refusé.", "ACCES_REFUSE");
    if (request.statut !== "RESOLUE" || !request.reopenUntil || request.reopenUntil < new Date()) {
      throw new ApiError(400, "La demande ne peut plus être rouverte.", "REOUVERTURE_IMPOSSIBLE");
    }
  }

  const now = new Date();
  const updated = await prisma.supportRequest.update({
    where: { id: input.requestId },
    data: {
      statut: input.statut,
      ...(input.statut === "RESOLUE"
        ? {
            closedAt: now,
            reopenUntil: new Date(now.getTime() + REOPEN_DAYS * 24 * 60 * 60 * 1000),
          }
        : {}),
      ...(input.statut === "FERMEE" ? { closedAt: now, reopenUntil: null } : {}),
      ...(input.statut === "OUVERTE" ? { closedAt: null, reopenUntil: null } : {}),
    },
  });

  if (staff && (input.statut === "RESOLUE" || input.statut === "FERMEE")) {
    await createNotification({
      userId: request.userId,
      type: "DEMANDE",
      titre: input.statut === "RESOLUE" ? `Demande ${requestNumber(request.numero)} résolue` : `Demande ${requestNumber(request.numero)} fermée`,
      message: request.sujet,
      url: `/demandes/${request.id}`,
      dedupeKey: `demande-statut:${request.id}:${input.statut}:${now.getTime()}`,
    });
  }

  await logAudit({
    acteur: input.actorId,
    userId: input.actorId,
    action: "DEMANDE_STATUT",
    details: { demandeId: input.requestId, statut: input.statut },
    ip: input.ip,
  });
  return updated;
}

export async function toggleFaq(requestId: string, publiee: boolean, actorId: string, ip: string) {
  const request = await prisma.supportRequest.update({
    where: { id: requestId },
    data: { faqPubliee: publiee },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: publiee ? "FAQ_PUBLIEE" : "FAQ_DEPUBLIEE",
    details: { demandeId: requestId },
    ip,
  });
  return request;
}

export async function listFaq() {
  const requests = await prisma.supportRequest.findMany({
    where: { faqPubliee: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      sujet: true,
      categorie: true,
      message: true,
      replies: {
        where: { interne: false, author: { role: { in: ["ADMIN", "MEMBRE_BDE"] } } },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { contenu: true, createdAt: true },
      },
    },
  });
  return requests.map((request) => ({
    id: request.id,
    question: request.sujet,
    categorie: request.categorie,
    reponse: request.replies[0]?.contenu ?? request.message,
    date: request.replies[0]?.createdAt ?? null,
  }));
}

export async function listTemplates() {
  return prisma.responseTemplate.findMany({
    orderBy: { titre: "asc" },
    include: { createdBy: { select: { email: true } } },
  });
}

export async function createTemplate(input: {
  titre: string;
  contenu: string;
  actorId: string;
  ip: string;
}) {
  const template = await prisma.responseTemplate.create({
    data: {
      titre: sanitizePlainText(input.titre, 160),
      contenu: sanitizePlainText(input.contenu, 5000),
      createdById: input.actorId,
    },
  });
  await logAudit({
    acteur: input.actorId,
    userId: input.actorId,
    action: "MODELE_REPONSE_CREE",
    details: { modeleId: template.id },
    ip: input.ip,
  });
  return template;
}

export async function assignRequest(requestId: string, actorId: string, ip: string) {
  const current = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: { statut: true },
  });
  if (!current) throw new ApiError(404, "Demande introuvable.", "INTROUVABLE");
  const request = await prisma.supportRequest.update({
    where: { id: requestId },
    data: {
      assignedToId: actorId,
      ...(current.statut === "OUVERTE" ? { statut: "EN_COURS" as RequestStatus } : {}),
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "DEMANDE_ASSIGNEE",
    details: { demandeId: requestId },
    ip,
  });
  return request;
}
