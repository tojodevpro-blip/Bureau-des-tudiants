import { assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { destroySession } from "@/lib/auth/session";
import { revokeOtherSessions } from "@/server/services/profile";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    await revokeOtherSessions(user.id, getRequestIp(request));
    await destroySession();
    return jsonOk({ disconnected: true });
  } catch (error) {
    return jsonError(error);
  }
}
