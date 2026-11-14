import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { eventSchema } from "@/lib/validation";
import { createEvent } from "@/server/services/events";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = eventSchema.parse(await readJson(request));
    const event = await createEvent(input, staff.id, getRequestIp(request));
    return jsonOk({ id: event.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
