import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { maskIdentifiant } from "@/lib/normalize";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const APP_TIMEZONE = "Indian/Antananarivo";
export const APP_LOCALE = "fr-FR";
const MADAGASCAR_OFFSET_MINUTES = 3 * 60;

export function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTime(value: Date | string, options?: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

export function formatShortDateTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

export function formatMoney(value: number) {
  return `${new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 0 }).format(value)} Ar`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toLocalDateTimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + MADAGASCAR_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function parseLocalDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.length === 16 ? `${value}:00+03:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function truncate(value: string, length = 120) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

export function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
