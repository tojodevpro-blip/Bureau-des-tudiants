import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Trop de tentatives. Réessaie plus tard.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type RateLimitRow = { count: number; reset_at: Date };

async function increment(key: string, windowMs: number): Promise<RateLimitRow> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<RateLimitRow[]>(Prisma.sql`
    INSERT INTO "rate_limits" ("key", "count", "reset_at")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limits"."reset_at" <= ${now} THEN 1
        ELSE "rate_limits"."count" + 1
      END,
      "reset_at" = CASE
        WHEN "rate_limits"."reset_at" <= ${now} THEN ${resetAt}
        ELSE "rate_limits"."reset_at"
      END
    RETURNING "count", "reset_at"
  `);
  return rows[0];
}

async function peek(key: string): Promise<RateLimitRow | null> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row) return null;
  if (row.resetAt.getTime() <= Date.now()) return null;
  return { count: row.count, reset_at: row.resetAt };
}

function secondsUntil(date: Date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

/** Vérifie le compteur sans l'incrémenter. */
export async function assertNotRateLimited(key: string, max: number) {
  const row = await peek(key);
  if (row && row.count >= max) {
    throw new RateLimitError(secondsUntil(row.reset_at));
  }
}

/** Incrémente un compteur d'échec et renvoie l'état courant. */
export async function recordFailure(key: string, windowMs: number) {
  const row = await increment(key, windowMs);
  return { count: row.count, resetAt: row.reset_at };
}

/** Incrémente à chaque tentative (vote, formulaires sensibles). */
export async function consumeAttempt(key: string, max: number, windowMs: number) {
  const row = await increment(key, windowMs);
  if (row.count > max) {
    throw new RateLimitError(secondsUntil(row.reset_at));
  }
  return { count: row.count, resetAt: row.reset_at };
}

export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

export function rateLimitKey(scope: string, identifier: string) {
  return `${scope}:${identifier.slice(0, 180)}`;
}
