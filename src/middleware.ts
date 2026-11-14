import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { secureCookiesEnabled } from "@/lib/cookie-security";

const CSRF_COOKIE = "bde_csrf";
const SESSION_COOKIE = "bde_session";

function loginRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/connexion", request.url));
}

async function readSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (
      !payload.sub ||
      (payload.role !== "STUDENT" &&
        payload.role !== "MEMBRE_BDE" &&
        payload.role !== "ADMIN")
    ) {
      return null;
    }
    return { role: payload.role, ver: payload.ver };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isStudentPage =
    pathname === "/tableau-de-bord" ||
    pathname.startsWith("/tableau-de-bord/") ||
    pathname === "/vote" ||
    pathname.startsWith("/vote/") ||
    pathname === "/candidature";
  const isUserPage = pathname === "/profil" || pathname === "/notifications";

  const session = await readSession(request);

  if (isAdminPage || isStudentPage || isUserPage) {
    if (!session) return loginRedirect(request);
    if (isAdminPage && session.role === "STUDENT") {
      return NextResponse.redirect(new URL("/tableau-de-bord", request.url));
    }
    if (isStudentPage && session.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-bde-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, crypto.randomUUID(), {
      httpOnly: false,
      secure: secureCookiesEnabled(),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
