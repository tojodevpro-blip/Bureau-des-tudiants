import { ApiError, assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { listMessages, markChannelRead, sendMessage } from "@/server/services/chat";
import { MAX_CHAT_IMAGE_BYTES } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUserApi();
    const { id } = await params;
    const url = new URL(request.url);
    const items = await listMessages({
      channelId: id,
      user: { id: user.id, role: user.role, classe: user.student?.classe ?? null },
      before: url.searchParams.get("before") ?? undefined,
      limit: Number(url.searchParams.get("limit")) || 50,
    });
    await markChannelRead(id, user.id);
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("image");
    const image = file instanceof File && file.size > 0 ? file : null;
    const contenu = form.get("contenu");
    const replyToId = form.get("replyToId");
    if (image && image.size > MAX_CHAT_IMAGE_BYTES) {
      throw new ApiError(413, "Image trop volumineuse (3 Mo maximum).", "FICHIER_TROP_LOURD");
    }
    const message = await sendMessage({
      channelId: id,
      author: {
        id: user.id,
        role: user.role,
        classe: user.student?.classe ?? null,
      },
      contenu: typeof contenu === "string" ? contenu : null,
      image,
      replyToId: typeof replyToId === "string" && replyToId ? replyToId : null,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: message.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
