import "server-only";

import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";
import { getCurrentUser, isApprovedStudent, type CurrentUser } from "@/lib/auth/session";

export async function requireUserPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireStudentPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role !== "STUDENT") redirect("/admin");
  return user;
}

export async function requireStaffPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role !== "ADMIN" && user.role !== "MEMBRE_BDE") {
    redirect("/tableau-de-bord");
  }
  return user;
}

export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await requireUserPage();
  if (user.role !== "ADMIN") {
    redirect(user.role === "MEMBRE_BDE" ? "/admin" : "/tableau-de-bord");
  }
  return user;
}

export function hasTreasuryAccess(user: Pick<CurrentUser, "role" | "tresorerieAccess">) {
  return user.role === "ADMIN" || user.tresorerieAccess;
}

export async function requireTreasuryPage(): Promise<CurrentUser> {
  const user = await requireStaffPage();
  if (!hasTreasuryAccess(user)) redirect("/admin");
  return user;
}

export async function requireUserApi(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "Tu dois être connecté pour continuer.", "NON_CONNECTE");
  }
  return user;
}

export async function requireApprovedStudentApi(): Promise<CurrentUser> {
  const user = await requireUserApi();
  if (user.role !== "STUDENT") {
    throw new ApiError(403, "Cette action est réservée aux étudiants.", "ROLE_INVALIDE");
  }
  if (user.statut === "EN_ATTENTE") {
    throw new ApiError(
      403,
      "Ton compte est en attente de validation par l'administration du BDE.",
      "COMPTE_EN_ATTENTE",
    );
  }
  if (!isApprovedStudent(user)) {
    throw new ApiError(403, "Ton compte n'est pas autorisé à voter.", "COMPTE_INACTIF");
  }
  return user;
}

export async function requireStaffApi(): Promise<CurrentUser> {
  const user = await requireUserApi();
  if (user.role !== "ADMIN" && user.role !== "MEMBRE_BDE") {
    throw new ApiError(403, "Acces reserve a l'equipe BDE.", "ACCES_REFUSE");
  }
  return user;
}

export async function requireAdminApi(): Promise<CurrentUser> {
  const user = await requireUserApi();
  if (user.role !== "ADMIN") {
    throw new ApiError(403, "Accès réservé à l'administrateur.", "ACCES_REFUSE");
  }
  return user;
}

export async function requireTreasuryApi(): Promise<CurrentUser> {
  const user = await requireUserApi();
  if (!hasTreasuryAccess(user)) {
    throw new ApiError(403, "Accès réservé à la trésorerie du BDE.", "ACCES_REFUSE");
  }
  return user;
}
