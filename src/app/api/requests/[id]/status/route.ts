import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { requestStatusSchema } from "@/lib/validation";
import { updateRequestStatus } from "@/server/services/requests";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const { id } = await params;
    const input = requestStatusSchema.parse(await readJson(request));
    await updateRequestStatus({
      requestId: id,
      actorId: user.id,
      actorRole: user.role,
      statut: input.statut,
      ip: getRequestIp(request),
    });
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
