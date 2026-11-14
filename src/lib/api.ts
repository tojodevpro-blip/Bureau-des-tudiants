import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { RateLimitError } from "@/lib/rate-limit";
import { CSRF_COOKIE } from "@/lib/auth/session";
import { InvalidMatriculeError } from "@/lib/normalize";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "ERREUR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { message: error.message, code: error.code } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "Certaines informations sont invalides.",
          code: "VALIDATION",
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error.message,
          code: "RATE_LIMIT",
          retryAfterSeconds: error.retryAfterSeconds,
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  if (error instanceof InvalidMatriculeError) {
    return NextResponse.json(
      { ok: false, error: { message: error.message, code: "MATRICULE_INVALIDE" } },
      { status: 400 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Cette valeur est déjà utilisée.",
            code: "CONFLIT",
          },
        },
        { status: 409 },
      );
    }
  }

  console.error("Erreur API non gérée", error);
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: "Une erreur inattendue est survenue. Réessaie ou contacte le BDE.",
        code: "INTERNE",
      },
    },
    { status: 500 },
  );
}

export async function assertCsrf(request: Request) {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ApiError(403, "Session expirée. Recharge la page et réessaie.", "CSRF");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      if (!host || new URL(origin).host !== host) {
        throw new ApiError(403, "Origine non autorisée.", "CSRF_ORIGIN");
      }
    } catch {
      throw new ApiError(403, "Origine non autorisée.", "CSRF_ORIGIN");
    }
  }
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "inconnu";
  return request.headers.get("x-real-ip")?.trim() || "inconnu";
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Corps de requête JSON invalide.", "JSON_INVALIDE");
  }
}
