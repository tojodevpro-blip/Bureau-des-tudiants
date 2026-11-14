import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { positionSchema } from "@/lib/validation";
import { deletePosition, updatePosition } from "@/server/services/elections";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = positionSchema.partial().parse(await readJson(request));
    const position = await updatePosition(id, input, admin.id, getRequestIp(request));
    return jsonOk(position);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    await deletePosition(id, admin.id, getRequestIp(request));
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
