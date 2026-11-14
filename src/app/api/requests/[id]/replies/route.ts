import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { supportReplySchema } from "@/lib/validation";
import { addReply } from "@/server/services/requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const { id } = await params;
    const input = supportReplySchema.parse(await readJson(request));
    const reply = await addReply({
      requestId: id,
      authorId: user.id,
      authorRole: user.role,
      contenu: input.contenu,
      interne: Boolean(input.interne),
      ip: getRequestIp(request),
    });
    return jsonOk({ id: reply.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
