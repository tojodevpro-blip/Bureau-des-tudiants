import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { candidatureReviewSchema } from "@/lib/validation";
import { reviewCandidature } from "@/server/services/candidatures";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = candidatureReviewSchema.parse(await readJson(request));
    const application = await reviewCandidature(id, input, staff.id, getRequestIp(request));
    return jsonOk(application);
  } catch (error) {
    return jsonError(error);
  }
}
