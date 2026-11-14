import { assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { deleteMessage } from "@/server/services/chat";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const { id } = await params;
    await deleteMessage({
      messageId: id,
      actor: { id: user.id, role: user.role },
      ip: getRequestIp(request),
    });
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
