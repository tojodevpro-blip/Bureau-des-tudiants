import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { muteSchema } from "@/lib/validation";
import { muteUser } from "@/server/services/chat";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = muteSchema.parse(await readJson(request));
    const mute = await muteUser({
      email: input.email,
      motif: input.motif,
      until: input.jusquAu ?? null,
      actorId: staff.id,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: mute.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
