import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { electionStatusSchema } from "@/lib/validation";
import { transitionElection } from "@/server/services/elections";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = electionStatusSchema.parse(await readJson(request));
    const election = await transitionElection(
      id,
      input.statut,
      admin.id,
      getRequestIp(request),
    );
    return jsonOk(election);
  } catch (error) {
    return jsonError(error);
  }
}
