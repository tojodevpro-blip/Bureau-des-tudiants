import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { pollStatusSchema } from "@/lib/validation";
import { updatePollStatus } from "@/server/services/polls";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = pollStatusSchema.parse(await readJson(request));
    await updatePollStatus(id, input.statut, staff.id, getRequestIp(request));
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
