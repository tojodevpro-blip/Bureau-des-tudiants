import { z } from "zod";
import { assertCsrf, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/services/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUserApi();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
    const data = await listNotifications(user.id, page, pageSize);
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}

const actionSchema = z.object({
  action: z.enum(["read", "read-all"]),
  id: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const input = actionSchema.parse(await readJson(request));
    if (input.action === "read-all") {
      const result = await markAllNotificationsRead(user.id);
      return jsonOk({ updated: result.count });
    }
    if (!input.id) return jsonOk({ updated: 0 });
    await markNotificationRead(user.id, input.id);
    return jsonOk({ updated: 1 });
  } catch (error) {
    return jsonError(error);
  }
}
