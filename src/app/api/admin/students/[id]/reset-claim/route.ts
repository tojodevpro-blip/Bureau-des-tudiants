import { assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { resetStudentClaim } from "@/server/services/students";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    await resetStudentClaim(id, admin.id, getRequestIp(request));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
