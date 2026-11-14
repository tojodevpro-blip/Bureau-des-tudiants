import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { userStatusSchema } from "@/lib/validation";
import { setUserStatus } from "@/server/services/users";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = userStatusSchema.parse(await readJson(request));
    const user = await setUserStatus(id, input.statut, admin.id, getRequestIp(request));
    return jsonOk({ id: user.id, statut: user.statut });
  } catch (error) {
    return jsonError(error);
  }
}
