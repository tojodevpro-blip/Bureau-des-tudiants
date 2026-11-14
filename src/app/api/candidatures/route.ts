import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireApprovedStudentApi } from "@/lib/auth/guard";
import { candidatureSchema } from "@/lib/validation";
import { submitCandidature } from "@/server/services/candidatures";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireApprovedStudentApi();
    const input = candidatureSchema.parse(await readJson(request));
    const application = await submitCandidature(user.id, input, getRequestIp(request));
    return jsonOk(application, 201);
  } catch (error) {
    return jsonError(error);
  }
}
