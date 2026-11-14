import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { electionCreateSchema } from "@/lib/validation";
import { createElection } from "@/server/services/elections";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const input = electionCreateSchema.parse(await readJson(request));
    const election = await createElection(input, admin.id, getRequestIp(request));
    return jsonOk(election, 201);
  } catch (error) {
    return jsonError(error);
  }
}
