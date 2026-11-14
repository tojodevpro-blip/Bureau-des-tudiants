import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { getMaintenanceMessage, isMaintenanceEnabled, setMaintenance } from "@/lib/maintenance";
import { maintenanceSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireAdminApi();
    return jsonOk({
      actif: await isMaintenanceEnabled(),
      message: await getMaintenanceMessage(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const input = maintenanceSchema.parse(await readJson(request));
    await setMaintenance(input.actif, input.message);
    await logAudit({
      acteur: admin.id,
      userId: admin.id,
      action: input.actif ? "MAINTENANCE_ACTIVEE" : "MAINTENANCE_DESACTIVEE",
      ip: getRequestIp(request),
    });
    return jsonOk({ actif: input.actif });
  } catch (error) {
    return jsonError(error);
  }
}
