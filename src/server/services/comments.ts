import "server-only";

import type { CommentTarget } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { sanitizePlainText } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";

export async function listComments(targetType: CommentTarget, targetId: string) {
  return prisma.comment.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      author: {
        select: {
          id: true,
          photoUrl: true,
          role: true,
          student: { select: { prenoms: true, nom: true } },
        },
      },
    },
  });
}

export async function createComment(input: {
  targetType: CommentTarget;
  targetId: string;
  authorId: string;
  contenu: string;
  ip: string;
}) {
  const exists =
    input.targetType === "ANNONCE"
      ? await prisma.announcement.findUnique({ where: { id: input.targetId }, select: { id: true } })
      : await prisma.event.findUnique({ where: { id: input.targetId }, select: { id: true } });
  if (!exists) throw new ApiError(404, "Le contenu n’existe plus.", "INTROUVABLE");

  const contenu = sanitizePlainText(input.contenu, 2000);
  if (contenu.length < 1) throw new ApiError(400, "Commentaire vide.", "VALIDATION");

  const comment = await prisma.comment.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      authorId: input.authorId,
      contenu,
    },
  });
  await logAudit({
    acteur: input.authorId,
    userId: input.authorId,
    action: "COMMENTAIRE_CREE",
    details: { commentId: comment.id, targetType: input.targetType, targetId: input.targetId },
    ip: input.ip,
  });
  return comment;
}

export async function deleteComment(input: {
  id: string;
  actorId: string;
  actorRole: "STUDENT" | "MEMBRE_BDE" | "ADMIN";
  ip: string;
}) {
  const comment = await prisma.comment.findUnique({ where: { id: input.id } });
  if (!comment) throw new ApiError(404, "Commentaire introuvable.", "INTROUVABLE");
  if (comment.authorId !== input.actorId && input.actorRole === "STUDENT") {
    throw new ApiError(403, "Tu ne peux supprimer que tes commentaires.", "ACCES_REFUSE");
  }
  await prisma.comment.update({
    where: { id: input.id },
    data: { deletedAt: new Date(), deletedById: input.actorId },
  });
  await logAudit({
    acteur: input.actorId,
    userId: input.actorId,
    action: "COMMENTAIRE_SUPPRIME",
    details: { commentId: input.id, auteur: comment.authorId },
    ip: input.ip,
  });
}
