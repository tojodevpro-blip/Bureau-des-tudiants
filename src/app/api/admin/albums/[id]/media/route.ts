import { ApiError, assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { uploadAlbumMedia } from "@/server/services/archives";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Aucun fichier reçu.", "FICHIER_MANQUANT");
    }
    const media = await uploadAlbumMedia(id, file, staff.id, getRequestIp(request));
    return jsonOk({ id: media.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
