import "server-only";

import { getSetting } from "@/lib/settings";

export const BRANDING_KEYS = {
  name: "identite_nom",
  shortName: "identite_nom_court",
  tagline: "identite_slogan",
  logoKey: "identite_logo_key",
  logoUrl: "identite_logo_url",
  logoVersion: "identite_logo_version",
} as const;

export type Branding = {
  name: string;
  shortName: string;
  tagline: string;
  logoKey: string;
  logoUrl: string;
};

export const DEFAULT_BRANDING: Branding = {
  name: "Bureau des Étudiants",
  shortName: "BDE",
  tagline: "La communauté étudiante, au quotidien",
  logoKey: "",
  logoUrl: "",
};

function clean(value: string, fallback: string, max: number) {
  const trimmed = value.trim().slice(0, max);
  return trimmed || fallback;
}

export async function getBranding(): Promise<Branding> {
  try {
    const [name, shortName, tagline, logoKey, logoUrl, logoVersion] = await Promise.all([
      getSetting(BRANDING_KEYS.name, DEFAULT_BRANDING.name),
      getSetting(BRANDING_KEYS.shortName, DEFAULT_BRANDING.shortName),
      getSetting(BRANDING_KEYS.tagline, DEFAULT_BRANDING.tagline),
      getSetting(BRANDING_KEYS.logoKey),
      getSetting(BRANDING_KEYS.logoUrl),
      getSetting(BRANDING_KEYS.logoVersion, "0"),
    ]);

    const resolvedLogo = logoKey
      ? `/api/branding/logo?v=${encodeURIComponent(logoVersion || "1")}`
      : logoUrl;

    return {
      name: clean(name, DEFAULT_BRANDING.name, 80),
      shortName: clean(shortName, DEFAULT_BRANDING.shortName, 16),
      tagline: clean(tagline, DEFAULT_BRANDING.tagline, 140),
      logoKey,
      logoUrl: resolvedLogo,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function brandingInitials(shortName: string) {
  return shortName.trim().slice(0, 4).toUpperCase() || DEFAULT_BRANDING.shortName;
}
