import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listAuditLogs({
  page = 1,
  action = "",
  q = "",
  pageSize = 40,
}: {
  page?: number;
  action?: string;
  q?: string;
  pageSize?: number;
}) {
  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { acteur: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { ip: { contains: q } },
    ];
  }

  const safePage = Math.max(1, page);
  const [items, total, allActions, last24h] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const actorIds = [
    ...new Set(
      items
        .map((item) => item.acteur)
        .filter((acteur) => acteur !== "anonyme" && !acteur.startsWith("system")),
    ),
  ];

  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: {
          id: true,
          email: true,
          telephone: true,
          role: true,
          student: { select: { nom: true, prenoms: true, matricule: true } },
        },
      })
    : [];

  return {
    items,
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    actions: allActions.map((item) => item.action),
    last24h,
    actors,
  };
}
