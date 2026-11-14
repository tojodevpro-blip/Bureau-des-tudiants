import "server-only";

import { randomBytes } from "node:crypto";
import type { EventRsvpStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createNotification, notifyClassOrAll } from "@/server/services/notifications";

export type EventInput = {
  titre: string;
  description: string;
  lieu: string;
  debut: Date | null;
  fin: Date | null;
  visuelUrl: string | null;
  categorie: string;
  capacite?: number | null;
  prixModalites?: string | null;
};

function ensureDates(input: EventInput) {
  if (!input.debut || !input.fin) {
    throw new ApiError(400, "Les dates de début et de fin sont obligatoires.", "VALIDATION");
  }
  if (input.fin <= input.debut) {
    throw new ApiError(400, "La fin doit être après le début.", "VALIDATION");
  }
  return { debut: input.debut, fin: input.fin };
}

export async function createEvent(input: EventInput, actorId: string, ip: string) {
  const dates = ensureDates(input);
  const event = await prisma.event.create({
    data: {
      ...input,
      ...dates,
      createdById: actorId,
    },
  });
  await notifyClassOrAll(
    { classes: [], toutes: true },
    {
      type: "EVENEMENT",
      titre: `Nouvel événement : ${event.titre}`,
      message: `${event.categorie} · ${event.lieu}`,
      url: `/programme/${event.id}`,
      dedupeKey: `evenement:${event.id}`,
    },
  );
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "EVENEMENT_CREE",
    details: { eventId: event.id },
    ip,
  });
  return event;
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput>,
  actorId: string,
  ip: string,
) {
  const current = await prisma.event.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Événement introuvable.", "INTROUVABLE");
  const merged: EventInput = {
    titre: input.titre ?? current.titre,
    description: input.description ?? current.description,
    lieu: input.lieu ?? current.lieu,
    debut: input.debut ?? current.debut,
    fin: input.fin ?? current.fin,
    visuelUrl: input.visuelUrl !== undefined ? input.visuelUrl : current.visuelUrl,
    categorie: input.categorie ?? current.categorie,
    capacite: input.capacite !== undefined ? input.capacite : current.capacite,
    prixModalites:
      input.prixModalites !== undefined ? input.prixModalites : current.prixModalites,
  };
  const dates = ensureDates(merged);
  const event = await prisma.event.update({
    where: { id },
    data: { ...input, ...dates },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "EVENEMENT_MODIFIE",
    details: { eventId: id },
    ip,
  });
  return event;
}

export async function cancelEvent(id: string, actorId: string, ip: string) {
  const event = await prisma.event.update({
    where: { id },
    data: { annuleLe: new Date() },
  });
  const rsvps = await prisma.eventRsvp.findMany({
    where: { eventId: id, statut: { in: ["INSCRIT", "LISTE_ATTENTE"] } },
    select: { userId: true },
  });
  await Promise.all(
    rsvps.map((rsvp) =>
      createNotification({
        userId: rsvp.userId,
        type: "EVENEMENT",
        titre: `Événement annulé : ${event.titre}`,
        message: event.lieu,
        url: `/programme/${event.id}`,
        dedupeKey: `evenement-annule:${event.id}:${rsvp.userId}`,
      }),
    ),
  );
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "EVENEMENT_ANNULE",
    details: { eventId: id },
    ip,
  });
  return event;
}

export async function listEvents(options: { includePast?: boolean; categorie?: string } = {}) {
  const now = new Date();
  const where: Prisma.EventWhereInput = {
    ...(options.includePast ? {} : { fin: { gte: now } }),
    ...(options.categorie ? { categorie: options.categorie } : {}),
  };
  const [items, categories] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { debut: "asc" },
      include: {
        _count: { select: { rsvps: { where: { statut: "INSCRIT" } } } },
      },
    }),
    prisma.event.findMany({ distinct: ["categorie"], select: { categorie: true }, orderBy: { categorie: "asc" } }),
  ]);
  return { items, categories: categories.map((item) => item.categorie) };
}

export async function listEventsForAdmin(options: { page: number; pageSize: number; search?: string }) {
  const where: Prisma.EventWhereInput = options.search
    ? {
        OR: [
          { titre: { contains: options.search, mode: "insensitive" } },
          { lieu: { contains: options.search, mode: "insensitive" } },
          { categorie: { contains: options.search, mode: "insensitive" } },
        ],
      }
    : {};
  const skip = (options.page - 1) * options.pageSize;
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { debut: "desc" },
      skip,
      take: options.pageSize,
      include: {
        _count: {
          select: {
            rsvps: { where: { statut: "INSCRIT" } },
          },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);
  return { items, total };
}

export async function getEventForUser(id: string, userId: string | null) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          rsvps: { where: { statut: "INSCRIT" } },
          },
      },
      rsvps: userId
        ? { where: { userId }, select: { statut: true, qrToken: true, checkedInAt: true } }
        : false,
    },
  });
  if (!event) throw new ApiError(404, "Événement introuvable.", "INTROUVABLE");
  return event;
}

export async function getEventForAdmin(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      rsvps: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              email: true,
              student: { select: { matricule: true, prenoms: true, nom: true, classe: true } },
            },
          },
        },
      },
      _count: { select: { rsvps: true } },
    },
  });
  if (!event) throw new ApiError(404, "Événement introuvable.", "INTROUVABLE");
  return event;
}

export async function registerForEvent(eventId: string, userId: string, ip: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new ApiError(404, "Événement introuvable.", "INTROUVABLE");
  if (event.annuleLe) throw new ApiError(400, "Cet événement est annulé.", "EVENEMENT_ANNULE");
  if (event.debut <= new Date()) throw new ApiError(400, "Les inscriptions sont closes.", "INSCRIPTIONS_CLOSES");

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.eventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing?.statut === "INSCRIT") return { rsvp: existing, promoted: false };
    const count = await tx.eventRsvp.count({ where: { eventId, statut: "INSCRIT" } });
    const statut: EventRsvpStatus =
      event.capacite && count >= event.capacite ? "LISTE_ATTENTE" : "INSCRIT";
    const rsvp = existing
      ? await tx.eventRsvp.update({
          where: { id: existing.id },
          data: { statut, qrToken: randomBytes(24).toString("base64url") },
        })
      : await tx.eventRsvp.create({
          data: {
            eventId,
            userId,
            statut,
            qrToken: randomBytes(24).toString("base64url"),
          },
        });
    return { rsvp, promoted: false };
  });

  await logAudit({
    acteur: userId,
    userId,
    action: result.rsvp.statut === "INSCRIT" ? "INSCRIPTION_EVENEMENT" : "LISTE_ATTENTE_EVENEMENT",
    details: { eventId },
    ip,
  });
  return result.rsvp;
}

export async function cancelEventRegistration(eventId: string, userId: string, ip: string) {
  const rsvp = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!rsvp) throw new ApiError(404, "Inscription introuvable.", "INTROUVABLE");
  await prisma.eventRsvp.update({
    where: { id: rsvp.id },
    data: { statut: "ANNULE", checkedInAt: null },
  });

  if (rsvp.statut === "INSCRIT") {
    const next = await prisma.eventRsvp.findFirst({
      where: { eventId, statut: "LISTE_ATTENTE" },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.eventRsvp.update({
        where: { id: next.id },
        data: { statut: "INSCRIT" },
      });
      await createNotification({
        userId: next.userId,
        type: "EVENEMENT",
        titre: "Une place s’est libérée",
        message: "Tu passes de la liste d’attente aux inscrits.",
        url: `/programme/${eventId}`,
        dedupeKey: `promotion:${eventId}:${next.userId}`,
      });
    }
  }
  await logAudit({
    acteur: userId,
    userId,
    action: "DESINSCRIPTION_EVENEMENT",
    details: { eventId },
    ip,
  });
}

export async function checkInByToken(
  eventId: string,
  token: string,
  actorId: string,
  ip: string,
) {
  const rsvp = await prisma.eventRsvp.findUnique({
    where: { qrToken: token },
    include: {
      user: {
        select: {
          email: true,
          student: { select: { prenoms: true, nom: true, matricule: true, classe: true } },
        },
      },
    },
  });
  if (!rsvp || rsvp.eventId !== eventId) {
    throw new ApiError(404, "Billet introuvable pour cet événement.", "BILLET_INVALIDE");
  }
  if (rsvp.statut === "ANNULE") throw new ApiError(400, "Inscription annulée.", "BILLET_INVALIDE");
  if (rsvp.checkedInAt) {
    return { alreadyCheckedIn: true, name: displayName(rsvp.user), at: rsvp.checkedInAt };
  }
  const updated = await prisma.eventRsvp.update({
    where: { id: rsvp.id },
    data: { checkedInAt: new Date() },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "PRESENCE_EVENEMENT",
    details: { eventId, rsvpId: rsvp.id },
    ip,
  });
  return { alreadyCheckedIn: false, name: displayName(rsvp.user), at: updated.checkedInAt };
}

function displayName(user: {
  email: string | null;
  student: { prenoms: string; nom: string } | null;
}) {
  return user.student ? `${user.student.prenoms} ${user.student.nom}` : user.email ?? "Étudiant";
}

export function icsEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function toIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
