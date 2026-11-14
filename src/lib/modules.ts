import "server-only";

import { getSetting, setSetting } from "@/lib/settings";

export const MODULE_KEYS = [
  "annonces",
  "demandes",
  "programme",
  "archives",
  "communication",
  "sondages",
  "candidatures",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_CATALOG: Record<
  ModuleKey,
  { label: string; description: string; publicHref: string; adminHref: string }
> = {
  annonces: {
    label: "Annonces",
    description: "Fil d’actualité, annonces ciblées, brouillons et commentaires.",
    publicHref: "/annonces",
    adminHref: "/admin/annonces",
  },
  demandes: {
    label: "Questions et demandes",
    description: "Tickets étudiants, réponses du BDE, FAQ et délais de traitement.",
    publicHref: "/demandes",
    adminHref: "/admin/demandes",
  },
  programme: {
    label: "Programme et agenda",
    description: "Événements, inscriptions, rappels, QR de présence et export ICS.",
    publicHref: "/programme",
    adminHref: "/admin/programme",
  },
  archives: {
    label: "Photos et documents",
    description: "Albums, galerie, documents officiels et signalements.",
    publicHref: "/archives",
    adminHref: "/admin/archives",
  },
  communication: {
    label: "Communication",
    description: "Canaux de discussion, modération, réactions et commentaires.",
    publicHref: "/communication",
    adminHref: "/admin/communication",
  },
  sondages: {
    label: "Sondages",
    description: "Sondages rapides distincts de l’élection officielle.",
    publicHref: "/sondages",
    adminHref: "/admin/sondages",
  },
  candidatures: {
    label: "Candidatures électorales",
    description: "Dépôt et validation des candidatures par poste.",
    publicHref: "/candidature",
    adminHref: "/admin/elections",
  },
};

const SETTING_KEY = "modules_actifs";
const DEFAULT_ENABLED = new Set<ModuleKey>(MODULE_KEYS);

export async function getEnabledModules(): Promise<Set<ModuleKey>> {
  const raw = await getSetting(SETTING_KEY, JSON.stringify(MODULE_KEYS));
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(DEFAULT_ENABLED);
    return new Set(parsed.filter((key): key is ModuleKey => MODULE_KEYS.includes(key)));
  } catch {
    return new Set(DEFAULT_ENABLED);
  }
}

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  return (await getEnabledModules()).has(key);
}

export async function setEnabledModules(keys: ModuleKey[]) {
  const clean = MODULE_KEYS.filter((key) => keys.includes(key));
  await setSetting(SETTING_KEY, JSON.stringify(clean));
}

export async function requireModule(key: ModuleKey) {
  if (!(await isModuleEnabled(key))) {
    const { redirect } = await import("next/navigation");
    redirect("/modules-a-venir");
  }
}
