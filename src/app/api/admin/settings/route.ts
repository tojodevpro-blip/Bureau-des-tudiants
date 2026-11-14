import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { settingsSchema } from "@/lib/validation";
import { SETTING_MANUAL_APPROVAL, setSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export async function PATCH(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const input = settingsSchema.parse(await readJson(request));
    await setSetting(
      SETTING_MANUAL_APPROVAL,
      input.validationManuelleInscriptions ? "true" : "false",
    );
    await logAudit({
      acteur: admin.id,
      action: "PARAMETRE_MODIFIE",
      details: {
        parametre: SETTING_MANUAL_APPROVAL,
        valeur: input.validationManuelleInscriptions,
      },
      ip: getRequestIp(request),
    });
    return jsonOk({ validationManuelleInscriptions: input.validationManuelleInscriptions });
  } catch (error) {
    return jsonError(error);
  }
}
