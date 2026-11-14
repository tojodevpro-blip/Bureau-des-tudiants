import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { candidateSchema } from "@/lib/validation";
import { createCandidate } from "@/server/services/elections";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = candidateSchema.parse(await readJson(request));
    const candidate = await createCandidate(id, input, admin.id, getRequestIp(request));
    return jsonOk(candidate, 201);
  } catch (error) {
    return jsonError(error);
  }
}
