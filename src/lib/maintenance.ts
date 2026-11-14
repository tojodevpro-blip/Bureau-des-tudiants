import "server-only";

import { getSetting, setSetting } from "@/lib/settings";

const SETTING_KEY = "mode_maintenance";
const MESSAGE_KEY = "message_maintenance";
const DEFAULT_MESSAGE =
  "La plateforme est en maintenance. Le BDE revient très vite. Merci de ta patience.";

export async function isMaintenanceEnabled() {
  return (await getSetting(SETTING_KEY, "false")) === "true";
}

export async function getMaintenanceMessage() {
  return getSetting(MESSAGE_KEY, DEFAULT_MESSAGE);
}

export async function setMaintenance(enabled: boolean, message?: string) {
  await setSetting(SETTING_KEY, enabled ? "true" : "false");
  if (typeof message === "string" && message.trim()) {
    await setSetting(MESSAGE_KEY, message.trim().slice(0, 500));
  }
}
