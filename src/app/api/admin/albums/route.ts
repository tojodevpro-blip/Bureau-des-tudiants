import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { albumSchema } from "@/lib/validation";
import { createAlbum } from "@/server/services/archives";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = albumSchema.parse(await readJson(request));
    const album = await createAlbum(input, staff.id, getRequestIp(request));
    return jsonOk({ id: album.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
