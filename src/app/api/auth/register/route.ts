import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth/session";
import { registerStudent } from "@/server/services/auth";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const body = await readJson(request);
    const input = registerSchema.parse(body);
    const result = await registerStudent(input, getRequestIp(request));

    if (!result.enAttente) {
      await createSession({ id: result.userId, role: "STUDENT", sessionVersion: 0 });
    }

    return jsonOk({ enAttente: result.enAttente, statut: result.statut }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
