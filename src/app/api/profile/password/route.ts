import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { createSession } from "@/lib/auth/session";
import { passwordChangeSchema } from "@/lib/validation";
import { changePassword } from "@/server/services/profile";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const input = passwordChangeSchema.parse(await readJson(request));
    const updated = await changePassword(user.id, input, getRequestIp(request));
    await createSession({
      id: updated.id,
      role: updated.role,
      sessionVersion: updated.sessionVersion,
    });
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
