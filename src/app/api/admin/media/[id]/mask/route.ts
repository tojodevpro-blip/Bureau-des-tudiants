import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { mediaMaskSchema } from "@/lib/validation";
import { maskMedia } from "@/server/services/archives";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = mediaMaskSchema.parse(await readJson(request));
    await maskMedia({
      mediaId: id,
      masque: input.masque,
      motif: input.motif,
      actorId: staff.id,
      ip: getRequestIp(request),
    });
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
