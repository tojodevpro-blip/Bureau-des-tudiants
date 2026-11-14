import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { studentUpdateSchema } from "@/lib/validation";
import { setStudentActive, updateStudent } from "@/server/services/students";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const input = studentUpdateSchema.parse(await readJson(request));
    const student = await updateStudent(id, input, admin.id, getRequestIp(request));
    return jsonOk(student);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const { id } = await params;
    const body = (await readJson<{ actif?: boolean }>(request)) ?? {};
    if (typeof body.actif !== "boolean") {
      return jsonError(new Error("actif requis"));
    }
    const student = await setStudentActive(id, body.actif, admin.id, getRequestIp(request));
    return jsonOk(student);
  } catch (error) {
    return jsonError(error);
  }
}
