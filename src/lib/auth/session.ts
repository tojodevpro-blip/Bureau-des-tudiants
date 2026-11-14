import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role, Student, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { secureCookiesEnabled } from "@/lib/cookie-security";

export const SESSION_COOKIE = "bde_session";
export const CSRF_COOKIE = "bde_csrf";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;

type SessionPayload = {
  sub: string;
  role: Role;
  ver: number;
};

const VALID_ROLES: Role[] = ["STUDENT", "MEMBRE_BDE", "ADMIN"];

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET est manquant ou trop court (32 caractères minimum).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: { id: string; role: Role; sessionVersion: number }) {
  const token = await new SignJWT({ role: user.role, ver: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookiesEnabled(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: secureCookiesEnabled(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export const getSessionPayload = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (
      !payload.sub ||
      !VALID_ROLES.includes(payload.role as Role) ||
      typeof payload.ver !== "number"
    ) {
      return null;
    }
    return { sub: payload.sub, role: payload.role as Role, ver: payload.ver };
  } catch {
    return null;
  }
});

export type CurrentUser = User & { student: Student | null };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const payload = await getSessionPayload();
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { student: true },
  });

  if (!user) return null;
  if (user.statut === "REJETE") return null;
  if (user.sessionVersion !== payload.ver) return null;
  return user;
});

export function isApprovedStudent(user: CurrentUser | null): boolean {
  return Boolean(
    user &&
      user.role === "STUDENT" &&
      user.statut === "APPROUVE" &&
      user.student &&
      user.student.actif,
  );
}
