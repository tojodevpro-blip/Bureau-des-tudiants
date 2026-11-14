import "server-only";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function listPendingUsers() {
  return prisma.user.findMany({
    where: { role: "STUDENT", statut: "EN_ATTENTE" },
    orderBy: { createdAt: "asc" },
    include: {
      student: {
        select: {
          id: true,
          matricule: true,
          nom: true,
          prenoms: true,
          classe: true,
          noteVerification: true,
        },
      },
    },
  });
}

export async function listRecentUsers(limit = 50) {
  return prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      student: {
        select: {
          matricule: true,
          nom: true,
          prenoms: true,
          classe: true,
          actif: true,
        },
      },
      _count: { select: { participations: true } },
    },
  });
}

export async function setUserStatus(
  userId: string,
  statut: "APPROUVE" | "REJETE",
  acteur: string,
  ip: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: { select: { matricule: true } } },
  });
  if (!user) throw new ApiError(404, "Utilisateur introuvable.", "UTILISATEUR_INTROUVABLE");
  if (user.role === "ADMIN") {
    throw new ApiError(409, "Le statut d’un administrateur ne peut pas être modifié ici.", "ADMIN_PROTEGE");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { statut },
  });

  await logAudit({
    acteur,
    action: statut === "APPROUVE" ? "COMPTE_APPROUVE" : "COMPTE_REJETE",
    details: { utilisateur: userId, matricule: user.student?.matricule ?? null },
    ip,
  });

  return updated;
}

export async function getUserStats() {
  const [total, approuves, enAttente, rejetes] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", statut: "APPROUVE" } }),
    prisma.user.count({ where: { role: "STUDENT", statut: "EN_ATTENTE" } }),
    prisma.user.count({ where: { role: "STUDENT", statut: "REJETE" } }),
  ]);
  return { total, approuves, enAttente, rejetes };
}

export async function listStaffUsers() {
  return prisma.user.findMany({
    where: { role: { in: ["MEMBRE_BDE", "ADMIN"] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { student: { select: { matricule: true, nom: true, prenoms: true, classe: true } } },
  });
}

export async function setUserRole(
  userId: string,
  role: "STUDENT" | "MEMBRE_BDE" | "ADMIN",
  acteurId: string,
  ip: string,
  tresorerieAccess?: boolean,
) {
  if (userId === acteurId) {
    throw new ApiError(409, "Tu ne peux pas modifier ton propre rôle.", "AUTO_MODIFICATION");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "Utilisateur introuvable.", "UTILISATEUR_INTROUVABLE");
  if (role === "STUDENT" && !user.studentId) {
    throw new ApiError(409, "Ce compte n'est lié à aucun matricule étudiant.", "MATRICULE_MANQUANT");
  }
  const nextTreasuryAccess =
    role === "MEMBRE_BDE" ? tresorerieAccess ?? user.tresorerieAccess : false;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      statut: "APPROUVE",
      tresorerieAccess: nextTreasuryAccess,
      sessionVersion: { increment: 1 },
    },
  });
  await logAudit({
    acteur: acteurId,
    userId: acteurId,
    action: "ROLE_MODIFIE",
    details: {
      utilisateur: userId,
      ancienRole: user.role,
      nouveauRole: role,
      tresorerieAccess: nextTreasuryAccess,
    },
    ip,
  });
  return updated;
}
