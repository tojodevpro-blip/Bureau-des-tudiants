import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { pollSchema } from "@/lib/validation";
import { createPoll } from "@/server/services/polls";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = pollSchema.parse(await readJson(request));
    const poll = await createPoll(input, staff.id, getRequestIp(request));
    return jsonOk({ id: poll.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
