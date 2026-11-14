export class InvalidMatriculeError extends Error {
  constructor(message = "Matricule invalide") {
    super(message);
    this.name = "InvalidMatriculeError";
  }
}

const WITH_SEPARATOR = /^([A-Z]{2,12}\d{1,4})[/-]([0-9]{1,6})$/;
const WITHOUT_SEPARATOR = /^([A-Z]{2,12}\d{2})([0-9]{1,6})$/;

/**
 * Normalise un matricule BDE.
 * - majuscules, sans espaces ni accents
 * - accepte "/", "-" ou l'espace comme séparateur
 * - complète le numéro à 3 chiffres
 * Ex : "can31/01" -> "CAN31/001", "MPJ18-5" -> "MPJ18/005"
 */
export function normalizeMatricule(input: string): string {
  if (typeof input !== "string" || !input.trim()) {
    throw new InvalidMatriculeError("Le matricule est vide.");
  }

  const cleaned = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "");

  let prefix: string;
  let number: string | undefined;

  const withSeparator = cleaned.match(WITH_SEPARATOR);
  if (withSeparator) {
    prefix = withSeparator[1];
    number = withSeparator[2];
  } else {
    const withoutSeparator = cleaned.match(WITHOUT_SEPARATOR);
    if (!withoutSeparator) {
      throw new InvalidMatriculeError(
        "Format attendu : préfixe + numéro, par exemple CAN31/001.",
      );
    }
    prefix = withoutSeparator[1];
    number = withoutSeparator[2];
  }

  if (!number) {
    throw new InvalidMatriculeError("Le matricule ne contient pas de numéro.");
  }

  const numeric = Number.parseInt(number, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new InvalidMatriculeError("Numéro de matricule invalide.");
  }

  const padded = String(numeric).padStart(3, "0");
  return `${prefix}/${padded}`;
}

export type MatriculeParseResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export function tryNormalizeMatricule(input: string): MatriculeParseResult {
  try {
    return { ok: true, value: normalizeMatricule(input) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Matricule invalide.",
    };
  }
}

/**
 * Normalise un nom pour comparaison : insensible à la casse, aux accents,
 * aux apostrophes et aux espaces multiples.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function namesMatch(input: string, stored: string): boolean {
  return normalizeName(input) === normalizeName(stored);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Normalise un email ou un téléphone malgache en identifiant stable. */
export function normalizeIdentifiant(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("261") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+261${digits.slice(1)}`;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 9) return `+261${digits}`;
  return digits;
}

export function isPhone(value: string): boolean {
  const normalized = normalizeIdentifiant(value);
  return /^\+\d{9,15}$/.test(normalized) || /^\d{7,15}$/.test(normalized);
}

export function maskIdentifiant(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    if (!domain) return "—";
    const visible = local.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
  }
  return `${value.slice(0, 4)}•••${value.slice(-2)}`;
}
