import { z } from "zod";
import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { handleReport } from "@/server/services/reports";

const schema = z.object({
  statut: z.enum(["TRAITEE", "REJETEE"]),
  resolution: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = schema.parse(await readJson(request));
    const report = await handleReport({
      id,
      handledById: staff.id,
      statut: input.statut,
      resolution: input.resolution,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: report.id, statut: report.statut });
  } catch (error) {
    return jsonError(error);
  }
}
