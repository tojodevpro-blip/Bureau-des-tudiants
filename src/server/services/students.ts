import "server-only";

import { Prisma, type Student } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { normalizeMatricule, tryNormalizeMatricule } from "@/lib/normalize";
import { logAudit } from "@/lib/audit";
import type { z } from "zod";
import type { studentCreateSchema, studentUpdateSchema } from "@/lib/validation";

type StudentCreateInput = z.infer<typeof studentCreateSchema>;
type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

export type StudentFilters = {
  q?: string;
  classe?: string;
  statut?: string;
  verif?: string;
  page?: number;
  pageSize?: number;
};

export async function listStudents(filters: StudentFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));
  const where: Prisma.StudentWhereInput = {};
  const and: Prisma.StudentWhereInput[] = [];

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    const normalized = tryNormalizeMatricule(q);
    and.push({
      OR: [
        { matricule: { contains: normalized.ok ? normalized.value : q.toUpperCase() } },
        { nom: { contains: q, mode: "insensitive" } },
        { prenoms: { contains: q, mode: "insensitive" } },
        { classe: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.classe?.trim()) {
    and.push({ classe: filters.classe.trim() });
  }

  if (filters.statut === "reclame") {
    and.push({ claimedByUserId: { not: null } });
  } else if (filters.statut === "libre") {
    and.push({ claimedByUserId: null });
  }

  if (filters.verif === "oui") {
    and.push({ noteVerification: { not: null } });
  }

  if (and.length) where.AND = and;

  const [total, items, classes, stats] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ classe: "asc" }, { matricule: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        claimedBy: {
          select: {
            id: true,
            email: true,
            telephone: true,
            statut: true,
            _count: { select: { participations: true } },
          },
        },
      },
    }),
    prisma.student.findMany({
      distinct: ["classe"],
      select: { classe: true },
      orderBy: { classe: "asc" },
    }),
    getStudentStats(),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    classes: classes.map((c) => c.classe),
    stats,
  };
}

export async function getStudentStats() {
  const [total, actifs, reclames, aVerifier, classes] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { actif: true } }),
    prisma.student.count({ where: { claimedByUserId: { not: null } } }),
    prisma.student.count({ where: { noteVerification: { not: null } } }),
    prisma.student.findMany({ distinct: ["classe"], select: { classe: true } }),
  ]);
  return { total, actifs, reclames, aVerifier, classes: classes.length };
}

export async function getStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      claimedBy: {
        select: {
          id: true,
          email: true,
          telephone: true,
          statut: true,
          createdAt: true,
          lastLogin: true,
          _count: { select: { participations: true } },
        },
      },
    },
  });
}

export async function createStudent(input: StudentCreateInput, acteur: string, ip: string) {
  const matricule = normalizeMatricule(input.matricule);
  const existing = await prisma.student.findUnique({ where: { matricule } });
  if (existing) {
    throw new ApiError(409, `Le matricule ${matricule} existe déjà.`, "MATRICULE_EXISTANT");
  }

  const student = await prisma.student.create({
    data: {
      matricule,
      matriculeBrut: input.matricule.trim(),
      nom: input.nom.trim(),
      prenoms: input.prenoms.trim(),
      classe: input.classe.trim(),
      noteVerification: input.noteVerification?.trim() || null,
      actif: input.actif ?? true,
    },
  });

  await logAudit({
    acteur,
    action: "ETUDIANT_AJOUTE",
    details: { matricule: student.matricule, classe: student.classe },
    ip,
  });

  return student;
}

export async function updateStudent(
  id: string,
  input: StudentUpdateInput,
  acteur: string,
  ip: string,
) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Étudiant introuvable.", "ETUDIANT_INTROUVABLE");

  const data: Prisma.StudentUpdateInput = {};
  if (input.nom !== undefined) data.nom = input.nom.trim();
  if (input.prenoms !== undefined) data.prenoms = input.prenoms.trim();
  if (input.classe !== undefined) data.classe = input.classe.trim();
  if (input.noteVerification !== undefined) {
    data.noteVerification = input.noteVerification?.trim() || null;
  }
  if (input.actif !== undefined) data.actif = input.actif;
  if (input.matricule !== undefined) {
    const matricule = normalizeMatricule(input.matricule);
    if (matricule !== existing.matricule) {
      const conflict = await prisma.student.findUnique({ where: { matricule } });
      if (conflict) {
        throw new ApiError(409, `Le matricule ${matricule} est déjà utilisé.`, "MATRICULE_EXISTANT");
      }
      data.matricule = matricule;
      data.matriculeBrut = input.matricule.trim();
    }
  }

  const student = await prisma.student.update({ where: { id }, data });

  await logAudit({
    acteur,
    action: "ETUDIANT_MODIFIE",
    details: {
      matricule: student.matricule,
      champs: Object.keys(data),
      actif: student.actif,
    },
    ip,
  });

  return student;
}

export async function setStudentActive(
  id: string,
  actif: boolean,
  acteur: string,
  ip: string,
) {
  const student = await prisma.student.update({ where: { id }, data: { actif } });
  await logAudit({
    acteur,
    action: actif ? "ETUDIANT_REACTIVE" : "ETUDIANT_DESACTIVE",
    details: { matricule: student.matricule },
    ip,
  });
  return student;
}

export async function resetStudentClaim(id: string, acteur: string, ip: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      claimedBy: {
        select: { id: true, _count: { select: { participations: true } } },
      },
    },
  });

  if (!student) throw new ApiError(404, "Étudiant introuvable.", "ETUDIANT_INTROUVABLE");
  if (!student.claimedByUserId || !student.claimedBy) {
    throw new ApiError(409, "Ce matricule n’est pas réclamé.", "NON_RECLAME");
  }
  if (student.claimedBy._count.participations > 0) {
    throw new ApiError(
      409,
      "Impossible de réinitialiser : ce compte a déjà voté. Contacte l’administrateur technique.",
      "COMPTE_A_VOTE",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: student.claimedBy!.id },
      data: { studentId: null, statut: "REJETE" },
    });
    await tx.student.update({
      where: { id: student.id },
      data: { claimedByUserId: null },
    });
    await tx.auditLog.create({
      data: {
        acteur,
        action: "RECLAMATION_REINITIALISEE",
        details: {
          matricule: student.matricule,
          ancienUtilisateur: student.claimedBy!.id,
        },
        ip,
      },
    });
  });

  return { ok: true };
}

export function studentDisplayName(student: Pick<Student, "nom" | "prenoms">) {
  return `${student.prenoms} ${student.nom}`.trim();
}
