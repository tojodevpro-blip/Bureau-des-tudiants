import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { electionUpdateSchema } from "@/lib/validation";
import { updateElection } from "@/server/services/elections";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = electionUpdateSchema.parse(await readJson(request));
    const election = await updateElection(id, input, admin.id, getRequestIp(request));
    return jsonOk(election);
  } catch (error) {
    return jsonError(error);
  }
}
