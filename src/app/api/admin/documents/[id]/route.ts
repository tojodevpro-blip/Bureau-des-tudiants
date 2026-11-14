import { assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { deleteDocument } from "@/server/services/archives";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    await deleteDocument(id, staff.id, getRequestIp(request));
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
