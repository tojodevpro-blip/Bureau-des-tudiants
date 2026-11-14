import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireApprovedStudentApi } from "@/lib/auth/guard";
import { reportSchema } from "@/lib/validation";
import { createReport } from "@/server/services/reports";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireApprovedStudentApi();
    const input = reportSchema.parse(await readJson(request));
    const report = await createReport({
      reporterId: user.id,
      ...input,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: report.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
