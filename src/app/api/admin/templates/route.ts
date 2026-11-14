import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { templateSchema } from "@/lib/validation";
import { createTemplate, listTemplates } from "@/server/services/requests";

export async function GET() {
  try {
    await requireStaffApi();
    return jsonOk({ items: await listTemplates() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = templateSchema.parse(await readJson(request));
    const template = await createTemplate({
      ...input,
      actorId: staff.id,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: template.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
