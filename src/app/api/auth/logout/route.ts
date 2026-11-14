import { assertCsrf, jsonError, jsonOk } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    await destroySession();
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
