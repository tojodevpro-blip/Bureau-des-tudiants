import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { destroySession } from "@/lib/auth/session";
import { accountDeleteSchema } from "@/lib/validation";
import { anonymizeAccount } from "@/server/services/profile";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const input = accountDeleteSchema.parse(await readJson(request));
    await anonymizeAccount(user.id, input.motDePasse, getRequestIp(request));
    await destroySession();
    return jsonOk({ anonymized: true });
  } catch (error) {
    return jsonError(error);
  }
}
