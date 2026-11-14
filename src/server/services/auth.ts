import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import {
  isEmail,
  isPhone,
  namesMatch,
  normalizeIdentifiant,
  normalizeMatricule,
} from "@/lib/normalize";
import {
  assertNotRateLimited,
  clearRateLimit,
  rateLimitKey,
  recordFailure,
} from "@/lib/rate-limit";
import { isManualApprovalEnabled } from "@/lib/settings";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Message public volontairement identique pour tous les refus de vérification,
// afin d'empêcher l'énumération des matricules existants.
const VERIFICATION_FAILED_MESSAGE =
  "Inscription impossible. Vérifie le matricule et le nom de famille, ou contacte l’administration du BDE.";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

function getIdentifierKind(value: string) {
  const normalized = normalizeIdentifiant(value);
  if (normalized.includes("@")) {
    if (!isEmail(normalized)) {
      throw new ApiError(400, "L’adresse email n’est pas valide.", "IDENTIFIANT_INVALIDE");
    }
    return { kind: "email" as const, value: normalized };
  }
  if (!isPhone(normalized)) {
    throw new ApiError(
      400,
      "Le numéro de téléphone n’est pas valide (ex. 034 12 345 67).",
      "IDENTIFIANT_INVALIDE",
    );
  }
  return { kind: "telephone" as const, value: normalized };
}

export async function registerStudent(input: RegisterInput, ip: string) {
  const matricule = normalizeMatricule(input.matricule);
  const identifiant = getIdentifierKind(input.identifiant);

  const ipKey = rateLimitKey("inscription:ip", ip);
  const matriculeKey = rateLimitKey("inscription:matricule", matricule);

  await assertNotRateLimited(ipKey, MAX_ATTEMPTS);
  await assertNotRateLimited(matriculeKey, MAX_ATTEMPTS);

  const fail = async (reason: string) => {
    await Promise.all([
      recordFailure(ipKey, WINDOW_MS),
      recordFailure(matriculeKey, WINDOW_MS),
    ]);
    await prisma.auditLog
      .create({
        data: {
          acteur: "anonyme",
          action: "INSCRIPTION_ECHEC",
          details: { motif: reason, matricule, identifiantType: identifiant.kind },
          ip,
        },
      })
      .catch(() => undefined);
    throw new ApiError(400, VERIFICATION_FAILED_MESSAGE, "VERIFICATION_ECHOUEE");
  };

  const student = await prisma.student.findUnique({ where: { matricule } });
  if (!student || !student.actif) return fail("matricule_introuvable_ou_inactif");
  if (student.claimedByUserId) return fail("matricule_deja_reclame");
  if (!namesMatch(input.nom, student.nom)) return fail("nom_incorrect");

  const existingUser = await prisma.user.findFirst({
    where:
      identifiant.kind === "email"
        ? { email: identifiant.value }
        : { telephone: identifiant.value },
    select: { id: true },
  });
  if (existingUser) {
    throw new ApiError(
      409,
      "Cet email ou ce numéro est déjà associé à un compte. Connecte-toi.",
      "IDENTIFIANT_EXISTANT",
    );
  }

  const manualApproval = await isManualApprovalEnabled();
  const passwordHash = await hashPassword(input.motDePasse);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          studentId: student.id,
          email: identifiant.kind === "email" ? identifiant.value : null,
          telephone: identifiant.kind === "telephone" ? identifiant.value : null,
          motDePasseHash: passwordHash,
          role: "STUDENT",
          statut: manualApproval ? "EN_ATTENTE" : "APPROUVE",
        },
      });

      const claimed = await tx.student.updateMany({
        where: { id: student.id, claimedByUserId: null, actif: true },
        data: { claimedByUserId: created.id },
      });

      if (claimed.count !== 1) {
        throw new ApiError(
          409,
          VERIFICATION_FAILED_MESSAGE,
          "MATRICULE_DEJA_RECLAME",
        );
      }

      await tx.auditLog.create({
        data: {
          acteur: created.id,
          action: "INSCRIPTION_REUSSIE",
          details: {
            matricule,
            statut: created.statut,
            validationManuelle: manualApproval,
          },
          ip,
        },
      });

      return created;
    });

    await Promise.all([
      clearRateLimit(ipKey),
      clearRateLimit(matriculeKey),
    ]);

    return {
      userId: user.id,
      statut: user.statut,
      enAttente: user.statut === "EN_ATTENTE",
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        if (target.includes("email") || target.includes("telephone")) {
          throw new ApiError(
            409,
            "Cet email ou ce numéro est déjà associé à un compte. Connecte-toi.",
            "IDENTIFIANT_EXISTANT",
          );
        }
        return fail("conflit_reclamation");
      }
    }
    throw error;
  }
}

export async function authenticate(input: LoginInput, ip: string) {
  const identifiant = normalizeIdentifiant(input.identifiant);
  if (!identifiant) {
    throw new ApiError(400, "Saisis ton email ou ton téléphone.", "IDENTIFIANT_INVALIDE");
  }

  const ipKey = rateLimitKey("connexion:ip", ip);
  const identifiantKey = rateLimitKey("connexion:identifiant", identifiant);

  await assertNotRateLimited(ipKey, MAX_ATTEMPTS);
  await assertNotRateLimited(identifiantKey, MAX_ATTEMPTS);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifiant }, { telephone: identifiant }],
    },
    include: { student: true },
  });

  const passwordOk = await verifyPassword(
    input.motDePasse,
    user?.motDePasseHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !passwordOk) {
    await Promise.all([
      recordFailure(ipKey, WINDOW_MS),
      recordFailure(identifiantKey, WINDOW_MS),
    ]);
    await prisma.auditLog
      .create({
        data: {
          acteur: user?.id ?? "anonyme",
          action: "CONNEXION_ECHEC",
          details: { identifiantType: identifiant.includes("@") ? "email" : "telephone" },
          ip,
        },
      })
      .catch(() => undefined);
    throw new ApiError(
      401,
      "Email/téléphone ou mot de passe incorrect.",
      "IDENTIFIANTS_INCORRECTS",
    );
  }

  if (user.statut === "EN_ATTENTE") {
    await prisma.auditLog
      .create({
        data: {
          acteur: user.id,
          action: "CONNEXION_REFUSEE",
          details: { motif: "compte_en_attente" },
          ip,
        },
      })
      .catch(() => undefined);
    throw new ApiError(
      403,
      "Ton compte est en attente de validation par l’administration du BDE.",
      "COMPTE_EN_ATTENTE",
    );
  }

  if (user.statut === "REJETE") {
    throw new ApiError(
      403,
      "Ce compte est désactivé. Contacte l’administration du BDE.",
      "COMPTE_DESACTIVE",
    );
  }

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }),
    prisma.auditLog
      .create({
        data: {
          acteur: user.id,
          action: "CONNEXION_REUSSIE",
          details: { role: user.role },
          ip,
        },
      })
      .catch(() => undefined),
    clearRateLimit(ipKey),
    clearRateLimit(identifiantKey),
  ]);

  return user;
}
