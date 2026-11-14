import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth/session";
import { authenticate } from "@/server/services/auth";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const body = await readJson(request);
    const input = loginSchema.parse(body);
    const user = await authenticate(input, getRequestIp(request));
    await createSession({ id: user.id, role: user.role, sessionVersion: user.sessionVersion });
    return jsonOk({ role: user.role });
  } catch (error) {
    return jsonError(error);
  }
}
