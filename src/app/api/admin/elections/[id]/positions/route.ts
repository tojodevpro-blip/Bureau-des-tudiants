import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { positionSchema } from "@/lib/validation";
import { createPosition } from "@/server/services/elections";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = positionSchema.parse(await readJson(request));
    const position = await createPosition(id, input, admin.id, getRequestIp(request));
    return jsonOk(position, 201);
  } catch (error) {
    return jsonError(error);
  }
}
