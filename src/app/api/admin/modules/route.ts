import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { logAudit } from "@/lib/audit";
import { getEnabledModules, setEnabledModules } from "@/lib/modules";
import { modulesUpdateSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireAdminApi();
    return jsonOk({ modules: [...(await getEnabledModules())] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const input = modulesUpdateSchema.parse(await readJson(request));
    await setEnabledModules(input.modules);
    await logAudit({
      acteur: admin.id,
      userId: admin.id,
      action: "MODULES_MODIFIES",
      details: { modules: input.modules },
      ip: getRequestIp(request),
    });
    return jsonOk({ modules: input.modules });
  } catch (error) {
    return jsonError(error);
  }
}
