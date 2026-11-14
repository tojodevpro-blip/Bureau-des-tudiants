import { assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { assignRequest } from "@/server/services/requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    await assignRequest(id, staff.id, getRequestIp(request));
    return jsonOk({ assigned: true });
  } catch (error) {
    return jsonError(error);
  }
}
