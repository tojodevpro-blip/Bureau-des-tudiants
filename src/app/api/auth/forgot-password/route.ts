import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation";
import { requestPasswordReset } from "@/server/services/profile";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const input = forgotPasswordSchema.parse(await readJson(request));
    const result = await requestPasswordReset(input.identifiant, getRequestIp(request));
    return jsonOk({
      message:
        "Si un compte correspond, un lien de réinitialisation vient d’être envoyé. Vérifie aussi tes courriers indésirables.",
      devToken: result.devToken,
    });
  } catch (error) {
    return jsonError(error);
  }
}
