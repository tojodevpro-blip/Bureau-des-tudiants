import "server-only";

import { prisma } from "@/lib/prisma";

export const SETTING_MANUAL_APPROVAL = "validation_manuelle_inscriptions";

export async function getSetting(key: string, fallback = "") {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.valeur ?? fallback;
}

export async function setSetting(key: string, valeur: string) {
  return prisma.setting.upsert({
    where: { key },
    create: { key, valeur },
    update: { valeur },
  });
}

export async function isManualApprovalEnabled() {
  return (await getSetting(SETTING_MANUAL_APPROVAL, "false")) === "true";
}
