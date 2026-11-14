import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { faqSchema } from "@/lib/validation";
import { toggleFaq } from "@/server/services/requests";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = faqSchema.parse(await readJson(request));
    await toggleFaq(id, input.publiee, staff.id, getRequestIp(request));
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
