import { assertCsrf, jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { markAnnouncementRead } from "@/server/services/announcements";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const { id } = await params;
    await markAnnouncementRead(id, user.id);
    return jsonOk({ read: true });
  } catch (error) {
    return jsonError(error);
  }
}
