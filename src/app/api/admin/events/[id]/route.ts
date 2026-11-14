import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { eventUpdateSchema } from "@/lib/validation";
import { cancelEvent, updateEvent } from "@/server/services/events";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = eventUpdateSchema.parse(await readJson(request));
    await updateEvent(id, input, staff.id, getRequestIp(request));
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    await cancelEvent(id, staff.id, getRequestIp(request));
    return jsonOk({ cancelled: true });
  } catch (error) {
    return jsonError(error);
  }
}
