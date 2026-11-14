import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import {
  assertNotRateLimited,
  consumeAttempt,
  rateLimitKey,
} from "@/lib/rate-limit";

const RESET_WINDOW_MS = 15 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function updateProfile(
  userId: string,
  input: {
    prenoms: string;
    nom: string;
    classe: string;
    photoUrl: string | null;
    notificationsEmail: boolean;
    consentementPhotos: boolean;
  },
  ip: string,
) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true },
  });
  if (!current) throw new ApiError(404, "Compte introuvable.", "INTROUVABLE");
  if (current.role === "STUDENT") {
    throw new ApiError(
      403,
      "Les informations de ton compte étudiant sont gérées par le BDE. Tu peux uniquement changer ton mot de passe.",
      "PROFIL_VERROUILLE",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        photoUrl: input.photoUrl,
        notificationsEmail: input.notificationsEmail,
        consentementPhotos: input.consentementPhotos,
      },
    });
    if (current.studentId && current.student) {
      await tx.student.update({
        where: { id: current.studentId },
        data: {
          prenoms: input.prenoms,
          nom: input.nom,
          classe: input.classe,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        acteur: userId,
        userId,
        action: "PROFIL_MODIFIE",
        details: { notificationsEmail: input.notificationsEmail, consentementPhotos: input.consentementPhotos },
        ip,
      },
    });
  });
}

export async function changePassword(
  userId: string,
  input: { motDePasseActuel: string; nouveauMotDePasse: string },
  ip: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "Compte introuvable.", "INTROUVABLE");

  if (!(await verifyPassword(input.motDePasseActuel, user.motDePasseHash))) {
    throw new ApiError(400, "Le mot de passe actuel est incorrect.", "MOT_DE_PASSE_INCORRECT");
  }
  if (await verifyPassword(input.nouveauMotDePasse, user.motDePasseHash)) {
    throw new ApiError(400, "Choisis un mot de passe différent de l’ancien.", "MOT_DE_PASSE_IDENTIQUE");
  }

  const hash = await hashPassword(input.nouveauMotDePasse);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { motDePasseHash: hash, sessionVersion: { increment: 1 } },
  });
  await logAudit({ acteur: userId, userId, action: "MOT_DE_PASSE_MODIFIE", ip });
  return updated;
}

export async function revokeOtherSessions(userId: string, ip: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
  await logAudit({ acteur: userId, userId, action: "SESSIONS_REVOQUEES", ip });
  return updated;
}

export async function requestPasswordReset(identifiant: string, ip: string) {
  const ipKey = rateLimitKey("mot-de-passe-oublie:ip", ip);
  await assertNotRateLimited(ipKey, 5);
  await consumeAttempt(ipKey, 5, RESET_WINDOW_MS);

  const normalized = normalize(identifiant);
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalized }, { telephone: normalized }] },
    select: { id: true, email: true },
  });

  let devToken: string | undefined;
  if (user) {
    const token = randomBytes(32).toString("base64url");
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const link = `${appUrl}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de ton mot de passe BDE",
        html: `<p>Une réinitialisation de mot de passe a été demandée.</p><p><a href="${link}">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans une heure. Si tu n’es pas à l’origine de cette demande, ignore cet e-mail.</p>`,
        text: `Réinitialise ton mot de passe : ${link} (valable une heure).`,
      });
    }
    if (process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_RESET === "true") {
      devToken = token;
    }
    await logAudit({ acteur: user.id, userId: user.id, action: "MOT_DE_PASSE_OUBLIE_DEMANDE", ip });
  }

  return { devToken };
}

export async function resetPassword(token: string, motDePasse: string, ip: string) {
  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new ApiError(
      400,
      "Ce lien est expiré ou déjà utilisé. Demande un nouveau lien.",
      "TOKEN_INVALIDE",
    );
  }

  const hash = await hashPassword(motDePasse);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { motDePasseHash: hash, sessionVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        acteur: row.userId,
        userId: row.userId,
        action: "MOT_DE_PASSE_REINITIALISE",
        ip,
      },
    });
  });
}

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      notifications: { orderBy: { createdAt: "desc" }, take: 500 },
      participations: true,
      applications: true,
      eventRsvps: true,
      pollParticipations: true,
      channelReads: true,
      messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 500 },
      comments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 500 },
      supportRequests: { include: { replies: true } },
      reportsMade: true,
    },
  });
  if (!user) throw new ApiError(404, "Compte introuvable.", "INTROUVABLE");
  const { motDePasseHash, sessionVersion, ...safe } = user;
  return { exportedAt: new Date().toISOString(), account: safe };
}

export async function anonymizeAccount(
  userId: string,
  motDePasse: string,
  ip: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "Compte introuvable.", "INTROUVABLE");
  if (!(await verifyPassword(motDePasse, user.motDePasseHash))) {
    throw new ApiError(400, "Mot de passe incorrect.", "MOT_DE_PASSE_INCORRECT");
  }

  const randomPassword = await hashPassword(randomBytes(32).toString("base64url"));
  await prisma.$transaction(async (tx) => {
    if (user.studentId) {
      await tx.student.updateMany({
        where: { id: user.studentId, claimedByUserId: userId },
        data: { claimedByUserId: null },
      });
    }
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: null,
        telephone: null,
        studentId: null,
        photoUrl: null,
        notificationsEmail: false,
        consentementPhotos: false,
        motDePasseHash: randomPassword,
        statut: "REJETE",
        sessionVersion: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        acteur: "compte-anonymise",
        action: "COMPTE_ANONYMISE",
        details: { ancienUserId: userId },
        ip,
      },
    });
  });

  return { anonymous: true };
}
