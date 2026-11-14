import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { importCommitSchema } from "@/lib/validation";
import { commitImport } from "@/server/services/import";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const input = importCommitSchema.parse(await readJson(request));
    const report = await commitImport(input.rows, admin.id, getRequestIp(request));
    return jsonOk(report);
  } catch (error) {
    return jsonError(error);
  }
}
