import {
  assertCsrf,
  getRequestIp,
  jsonError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { requireTreasuryApi } from "@/lib/auth/guard";
import { treasuryEntrySchema } from "@/lib/validation";
import { createTreasuryEntry, listTreasuryEntries } from "@/server/services/treasury";

export async function GET(request: Request) {
  try {
    await requireTreasuryApi();
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const data = await listTreasuryEntries({
      type: type === "RECETTE" || type === "DEPENSE" ? type : undefined,
      categorie: url.searchParams.get("categorie") ?? undefined,
      eventId: url.searchParams.get("eventId") ?? undefined,
      q: url.searchParams.get("q")?.trim() || undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      page,
      pageSize: Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? "50") || 50)),
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireTreasuryApi();
    const input = treasuryEntrySchema.parse(await readJson(request));
    const entry = await createTreasuryEntry(input, user.id, getRequestIp(request));
    return jsonOk(entry, 201);
  } catch (error) {
    return jsonError(error);
  }
}
