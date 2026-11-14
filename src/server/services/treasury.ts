import "server-only";

import type {
  Prisma,
  TreasuryEntryType,
  TreasuryPaymentMethod,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export type TreasuryInput = {
  type: TreasuryEntryType;
  libelle: string;
  categorie: string;
  montant: number;
  date: Date;
  moyenPaiement: TreasuryPaymentMethod;
  reference?: string | null;
  payeur?: string | null;
  note?: string | null;
  eventId?: string | null;
};

export type TreasuryFilters = {
  type?: TreasuryEntryType;
  categorie?: string;
  eventId?: string;
  q?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

function buildWhere(filters: TreasuryFilters): Prisma.TreasuryEntryWhereInput {
  const date: Prisma.DateTimeFilter = {};
  if (filters.from) date.gte = new Date(`${filters.from}T00:00:00+03:00`);
  if (filters.to) date.lte = new Date(`${filters.to}T23:59:59.999+03:00`);

  return {
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categorie ? { categorie: filters.categorie } : {}),
    ...(filters.eventId ? { eventId: filters.eventId } : {}),
    ...(filters.from || filters.to ? { date } : {}),
    ...(filters.q
      ? {
          OR: [
            { libelle: { contains: filters.q, mode: "insensitive" } },
            { reference: { contains: filters.q, mode: "insensitive" } },
            { payeur: { contains: filters.q, mode: "insensitive" } },
            { note: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export async function listTreasuryEntries(filters: TreasuryFilters) {
  const where = buildWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [items, total, recettes, depenses, byCategory, events] = await Promise.all([
    prisma.treasuryEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: filters.pageSize,
      include: {
        event: { select: { id: true, titre: true, debut: true } },
        createdBy: {
          select: {
            email: true,
            student: { select: { prenoms: true, nom: true } },
          },
        },
      },
    }),
    prisma.treasuryEntry.count({ where }),
    prisma.treasuryEntry.aggregate({
      where: { AND: [where, { type: "RECETTE" }] },
      _sum: { montant: true },
    }),
    prisma.treasuryEntry.aggregate({
      where: { AND: [where, { type: "DEPENSE" }] },
      _sum: { montant: true },
    }),
    prisma.treasuryEntry.groupBy({
      by: ["type", "categorie"],
      where,
      _sum: { montant: true },
      orderBy: { _sum: { montant: "desc" } },
    }),
    prisma.event.findMany({
      orderBy: { debut: "desc" },
      take: 80,
      select: { id: true, titre: true, debut: true },
    }),
  ]);

  const totalRecettes = recettes._sum.montant ?? 0;
  const totalDepenses = depenses._sum.montant ?? 0;

  return {
    items,
    total,
    recettes: totalRecettes,
    depenses: totalDepenses,
    solde: totalRecettes - totalDepenses,
    byCategory,
    events,
  };
}

export async function listTreasuryEvents() {
  return prisma.event.findMany({
    orderBy: { debut: "desc" },
    take: 80,
    select: { id: true, titre: true, debut: true },
  });
}

export async function getTreasuryEntry(id: string) {
  const entry = await prisma.treasuryEntry.findUnique({ where: { id } });
  if (!entry) throw new ApiError(404, "Opération introuvable.", "INTROUVABLE");
  return entry;
}

export async function getTreasuryReceipt(id: string) {
  const entry = await prisma.treasuryEntry.findUnique({
    where: { id },
    include: {
      event: { select: { titre: true } },
      createdBy: {
        select: {
          email: true,
          student: { select: { prenoms: true, nom: true } },
        },
      },
    },
  });
  if (!entry) throw new ApiError(404, "Opération introuvable.", "INTROUVABLE");
  return entry;
}

async function ensureEvent(eventId: string | null | undefined) {
  if (!eventId) return null;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) throw new ApiError(400, "Événement introuvable.", "EVENEMENT_INTROUVABLE");
  return eventId;
}

function cleanNullable(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function createTreasuryEntry(
  input: TreasuryInput,
  actorId: string,
  ip: string,
) {
  const eventId = await ensureEvent(input.eventId);
  const entry = await prisma.treasuryEntry.create({
    data: {
      type: input.type,
      libelle: input.libelle,
      categorie: input.categorie,
      montant: input.montant,
      date: input.date,
      moyenPaiement: input.moyenPaiement,
      reference: cleanNullable(input.reference),
      payeur: cleanNullable(input.payeur),
      note: cleanNullable(input.note),
      eventId,
      createdById: actorId,
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action:
      entry.type === "RECETTE"
        ? "TRESORERIE_RECETTE_AJOUTEE"
        : "TRESORERIE_DEPENSE_AJOUTEE",
    details: {
      treasuryEntryId: entry.id,
      montant: entry.montant,
      categorie: entry.categorie,
      date: entry.date.toISOString(),
    },
    ip,
  });
  return entry;
}

export async function updateTreasuryEntry(
  id: string,
  input: TreasuryInput,
  actorId: string,
  ip: string,
) {
  await getTreasuryEntry(id);
  const eventId = await ensureEvent(input.eventId);
  const entry = await prisma.treasuryEntry.update({
    where: { id },
    data: {
      type: input.type,
      libelle: input.libelle,
      categorie: input.categorie,
      montant: input.montant,
      date: input.date,
      moyenPaiement: input.moyenPaiement,
      reference: cleanNullable(input.reference),
      payeur: cleanNullable(input.payeur),
      note: cleanNullable(input.note),
      eventId,
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "TRESORERIE_OPERATION_MODIFIEE",
    details: {
      treasuryEntryId: entry.id,
      montant: entry.montant,
      type: entry.type,
      categorie: entry.categorie,
    },
    ip,
  });
  return entry;
}

export async function deleteTreasuryEntry(id: string, actorId: string, ip: string) {
  const entry = await getTreasuryEntry(id);
  await prisma.treasuryEntry.delete({ where: { id } });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "TRESORERIE_OPERATION_SUPPRIMEE",
    details: {
      treasuryEntryId: entry.id,
      montant: entry.montant,
      type: entry.type,
      categorie: entry.categorie,
    },
    ip,
  });
  return entry;
}
