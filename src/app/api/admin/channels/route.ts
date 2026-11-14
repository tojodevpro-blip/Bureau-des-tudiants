import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { channelSchema } from "@/lib/validation";
import { createChannel } from "@/server/services/chat";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = channelSchema.parse(await readJson(request));
    const channel = await createChannel(input, staff.id, getRequestIp(request));
    return jsonOk({ id: channel.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
