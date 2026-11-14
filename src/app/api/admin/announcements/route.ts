import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { announcementSchema } from "@/lib/validation";
import { createAnnouncement } from "@/server/services/announcements";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const input = announcementSchema.parse(await readJson(request));
    const announcement = await createAnnouncement(input, staff.id, getRequestIp(request));
    return jsonOk({ id: announcement.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
