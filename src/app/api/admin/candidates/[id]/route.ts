import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { candidateUpdateSchema } from "@/lib/validation";
import { deleteCandidate, updateCandidate } from "@/server/services/elections";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = candidateUpdateSchema.parse(await readJson(request));
    const candidate = await updateCandidate(id, input, admin.id, getRequestIp(request));
    return jsonOk(candidate);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    await deleteCandidate(id, admin.id, getRequestIp(request));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
