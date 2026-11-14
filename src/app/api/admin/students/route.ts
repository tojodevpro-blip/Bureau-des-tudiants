import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { studentCreateSchema } from "@/lib/validation";
import { createStudent } from "@/server/services/students";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const input = studentCreateSchema.parse(await readJson(request));
    const student = await createStudent(input, admin.id, getRequestIp(request));
    return jsonOk(student, 201);
  } catch (error) {
    return jsonError(error);
  }
}
