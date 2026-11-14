import "server-only";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createNotification, notifyUsers } from "@/server/services/notifications";
import type { z } from "zod";
import type { candidatureReviewSchema, candidatureSchema } from "@/lib/validation";

type CandidatureInput = z.infer<typeof candidatureSchema>;
type CandidatureReviewInput = z.infer<typeof candidatureReviewSchema>;

const CANDIDATURE_STATUSES = ["CANDIDATURES", "OUVERTE"] as const;

export async function getCandidaturePageData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { studentId: true, statut: true, student: { select: { actif: true } } },
  });
  if (!user?.studentId || !user.student?.actif) {
    return { election: null, application: null, closed: false, canApply: false };
  }

  const election = await prisma.election.findFirst({
    where: { statut: { in: [...CANDIDATURE_STATUSES] } },
    orderBy: { updatedAt: "desc" },
    include: {
      positions: {
        orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
        include: {
          _count: { select: { candidates: true } },
        },
      },
      applications: {
        where: { studentId: user.studentId },
        take: 1,
        include: { position: { select: { titre: true } } },
      },
    },
  });

  if (!election) {
    return { election: null, application: null, closed: false, canApply: false };
  }

  return {
    election,
    application: election.applications[0] ?? null,
    closed: election.statut !== "CANDIDATURES",
    canApply:
      election.statut === "CANDIDATURES" &&
      user.statut === "APPROUVE" &&
      election.applications.length === 0,
  };
}

export async function submitCandidature(
  userId: string,
  input: CandidatureInput,
  ip: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true },
  });
  if (!user?.student || user.role !== "STUDENT" || user.statut !== "APPROUVE" || !user.student.actif) {
    throw new ApiError(403, "Ton compte étudiant doit être approuvé et actif.", "COMPTE_NON_AUTORISE");
  }

  const election = await prisma.election.findFirst({
    where: { statut: "CANDIDATURES" },
    orderBy: { updatedAt: "desc" },
    include: { positions: { select: { id: true, titre: true } } },
  });
  if (!election) {
    throw new ApiError(
      409,
      "Les candidatures ne sont pas ouvertes actuellement.",
      "CANDIDATURES_FERMEES",
    );
  }

  const position = election.positions.find((item) => item.id === input.positionId);
  if (!position) {
    throw new ApiError(400, "Ce poste n’appartient pas à l’élection en cours.", "POSTE_INVALIDE");
  }

  const existing = await prisma.candidateApplication.findFirst({
    where: { electionId: election.id, studentId: user.student.id },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(
      409,
      "Tu as déjà déposé une candidature pour cette élection.",
      "CANDIDATURE_EXISTANTE",
    );
  }

  const application = await prisma.candidateApplication.create({
    data: {
      electionId: election.id,
      positionId: position.id,
      studentId: user.student.id,
      photoUrl: input.photoUrl,
      slogan: input.slogan?.trim() || null,
      programme: input.programme.trim(),
      videoUrl: input.videoUrl,
    },
  });

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MEMBRE_BDE"] }, statut: "APPROUVE" },
    select: { id: true },
  });
  await notifyUsers(
    staff.map((member) => member.id),
    {
      type: "CANDIDATURE",
      titre: "Nouvelle candidature à valider",
      message: `${user.student.prenoms} ${user.student.nom} candidate au poste « ${position.titre} ».`,
      url: `/admin/elections/${election.id}`,
    },
  );

  await logAudit({
    acteur: user.id,
    action: "CANDIDATURE_DEPOSEE",
    details: {
      electionId: election.id,
      positionId: position.id,
      applicationId: application.id,
    },
    ip,
    userId: user.id,
  });

  return application;
}

export async function reviewCandidature(
  applicationId: string,
  input: CandidatureReviewInput,
  acteur: string,
  ip: string,
) {
  if (input.statut === "REFUSEE" && !input.motif?.trim()) {
    throw new ApiError(400, "Indique le motif du refus.", "MOTIF_REQUIS");
  }

  const application = await prisma.candidateApplication.findUnique({
    where: { id: applicationId },
    include: {
      election: { select: { id: true, statut: true } },
      position: { select: { id: true, titre: true } },
      student: { select: { id: true, nom: true, prenoms: true, matricule: true, classe: true } },
    },
  });
  if (!application) {
    throw new ApiError(404, "Candidature introuvable.", "CANDIDATURE_INTROUVABLE");
  }
  if (!["BROUILLON", "CANDIDATURES"].includes(application.election.statut)) {
    throw new ApiError(
      409,
      "Les candidatures sont verrouillées pour cette élection.",
      "CANDIDATURES_VERROUILLEES",
    );
  }
  if (application.statut !== "EN_ATTENTE") {
    throw new ApiError(409, "Cette candidature a déjà été traitée.", "CANDIDATURE_TRAITEE");
  }

  if (input.statut === "VALIDEE") {
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        electionId: application.electionId,
        positionId: application.positionId,
        studentId: application.studentId,
      },
      select: { id: true },
    });
    if (existingCandidate) {
      throw new ApiError(409, "Un candidat existe déjà pour ce poste.", "CANDIDAT_EXISTANT");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const reviewed = await tx.candidateApplication.update({
      where: { id: applicationId },
      data: {
        statut: input.statut,
        motif: input.motif?.trim() || null,
        reviewedById: acteur,
        reviewedAt: new Date(),
      },
    });

    if (input.statut === "VALIDEE") {
      const max = await tx.candidate.aggregate({
        where: {
          electionId: application.electionId,
          positionId: application.positionId,
        },
        _max: { ordre: true },
      });
      await tx.candidate.create({
        data: {
          electionId: application.electionId,
          positionId: application.positionId,
          studentId: application.studentId,
          nomAffiche: `${application.student.prenoms} ${application.student.nom}`.trim(),
          photoUrl: application.photoUrl,
          slogan: application.slogan,
          programme: application.programme,
          videoUrl: application.videoUrl,
          ordre: (max._max.ordre ?? 0) + 1,
        },
      });
    }

    return reviewed;
  });

  const studentUser = await prisma.user.findFirst({
    where: { studentId: application.studentId },
    select: { id: true },
  });
  if (studentUser) {
    await createNotification({
      userId: studentUser.id,
      type: "CANDIDATURE",
      titre:
        input.statut === "VALIDEE"
          ? "Candidature validée"
          : "Candidature refusée",
      message:
        input.statut === "VALIDEE"
          ? `Ta candidature au poste « ${application.position.titre} » a été validée. Tu figures désormais sur la liste des candidats.`
          : `Ta candidature au poste « ${application.position.titre} » a été refusée.${input.motif?.trim() ? ` Motif : ${input.motif.trim()}` : ""}`,
      url: "/candidature",
    });
  }

  await logAudit({
    acteur,
    action: input.statut === "VALIDEE" ? "CANDIDATURE_VALIDEE" : "CANDIDATURE_REFUSEE",
    details: {
      electionId: application.electionId,
      positionId: application.positionId,
      applicationId,
      studentId: application.studentId,
      motif: input.motif?.trim() || null,
    },
    ip,
  });

  return updated;
}
