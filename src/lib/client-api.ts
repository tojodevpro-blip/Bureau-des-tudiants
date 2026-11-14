"use client";

export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)bde_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; code: string; fields?: Record<string, string[]> } };

export class ApiClientError extends Error {
  code: string;
  fields?: Record<string, string[]>;

  constructor(message: string, code = "ERREUR", fields?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.fields = fields;
  }
}

export async function apiFetch<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", getCsrfToken());
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(
      "Connexion impossible. Vérifie ta connexion internet et réessaie.",
      "RESEAU",
    );
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.ok === false) {
    const message =
      payload && payload.ok === false
        ? payload.error.message
        : "Une erreur est survenue. Réessaie ou contacte le BDE.";
    const code = payload && payload.ok === false ? payload.error.code : "ERREUR";
    const fields = payload && payload.ok === false ? payload.error.fields : undefined;
    throw new ApiClientError(message, code, fields);
  }

  return payload.data;
}
