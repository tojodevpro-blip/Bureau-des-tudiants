import { ApiError, assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { supportRequestSchema } from "@/lib/validation";
import { createSupportRequest } from "@/server/services/requests";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    if (user.role !== "STUDENT") {
      throw new ApiError(403, "Les demandes sont réservées aux étudiants.", "ROLE_INVALIDE");
    }
    const input = supportRequestSchema.parse(await readJson(request));
    const created = await createSupportRequest(
      input,
      { id: user.id, studentId: user.studentId },
      getRequestIp(request),
    );
    return jsonOk({ id: created.id, numero: created.numero }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
