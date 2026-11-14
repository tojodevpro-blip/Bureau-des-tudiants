import {
  assertCsrf,
  getRequestIp,
  jsonError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { requireTreasuryApi } from "@/lib/auth/guard";
import { treasuryEntrySchema } from "@/lib/validation";
import {
  deleteTreasuryEntry,
  getTreasuryEntry,
  updateTreasuryEntry,
} from "@/server/services/treasury";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireTreasuryApi();
    const { id } = await params;
    return jsonOk(await getTreasuryEntry(id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireTreasuryApi();
    const { id } = await params;
    const input = treasuryEntrySchema.parse(await readJson(request));
    const entry = await updateTreasuryEntry(id, input, user.id, getRequestIp(request));
    return jsonOk(entry);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireTreasuryApi();
    const { id } = await params;
    await deleteTreasuryEntry(id, user.id, getRequestIp(request));
    return jsonOk({ id });
  } catch (error) {
    return jsonError(error);
  }
}
