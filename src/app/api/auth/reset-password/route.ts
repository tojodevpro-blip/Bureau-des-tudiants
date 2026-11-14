import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPassword } from "@/server/services/profile";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const input = resetPasswordSchema.parse(await readJson(request));
    await resetPassword(input.token, input.motDePasse, getRequestIp(request));
    return jsonOk({ reset: true });
  } catch (error) {
    return jsonError(error);
  }
}
