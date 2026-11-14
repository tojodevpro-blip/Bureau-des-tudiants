import { assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireApprovedStudentApi } from "@/lib/auth/guard";
import { cancelEventRegistration, registerForEvent } from "@/server/services/events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireApprovedStudentApi();
    const { id } = await params;
    const rsvp = await registerForEvent(id, user.id, getRequestIp(request));
    return jsonOk({ statut: rsvp.statut });
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
    const user = await requireApprovedStudentApi();
    const { id } = await params;
    await cancelEventRegistration(id, user.id, getRequestIp(request));
    return jsonOk({ cancelled: true });
  } catch (error) {
    return jsonError(error);
  }
}
