import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { reorderSchema } from "@/lib/validation";
import { reorderCandidates } from "@/server/services/candidate-order";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = reorderSchema.parse(await readJson(request));
    await reorderCandidates(id, input.orderedIds, admin.id, getRequestIp(request));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
