import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { announcementUpdateSchema } from "@/lib/validation";
import { archiveAnnouncement, updateAnnouncement } from "@/server/services/announcements";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const input = announcementUpdateSchema.parse(await readJson(request));
    const announcement = await updateAnnouncement(id, input, staff.id, getRequestIp(request));
    return jsonOk({ id: announcement.id });
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
    const staff = await requireStaffApi();
    const { id } = await params;
    await archiveAnnouncement(id, staff.id, getRequestIp(request));
    return jsonOk({ archived: true });
  } catch (error) {
    return jsonError(error);
  }
}
