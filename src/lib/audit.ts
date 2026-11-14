import "server-only";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  acteur: string;
  action: string;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userId?: string | null;
};

/**
 * Journalise une action sensible. Ne jamais y mettre de mot de passe,
 * de nom complet inutile ou le choix de vote d'un étudiant.
 */
export async function logAudit({ acteur, action, details, ip, userId }: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        acteur,
        action,
        details: details ? (details as object) : undefined,
        ip: ip ?? null,
        userId: userId ?? null,
      },
    });
  } catch (error) {
    console.error("Impossible d'écrire le journal d'audit", error);
  }
}
