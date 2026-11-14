import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { checkinSchema } from "@/lib/validation";
import { checkInByToken } from "@/server/services/events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = checkinSchema.parse(await readJson(request));
    const result = await checkInByToken(id, input.token, staff.id, getRequestIp(request));
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
