import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { roleUpdateSchema } from "@/lib/validation";
import { setUserRole } from "@/server/services/users";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = roleUpdateSchema.parse(await readJson(request));
    const user = await setUserRole(
      id,
      input.role,
      admin.id,
      getRequestIp(request),
      input.tresorerieAccess,
    );
    return jsonOk({ id: user.id, role: user.role, tresorerieAccess: user.tresorerieAccess });
  } catch (error) {
    return jsonError(error);
  }
}
