import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { commentSchema } from "@/lib/validation";
import { createComment } from "@/server/services/comments";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const input = commentSchema.parse(await readJson(request));
    const comment = await createComment({
      ...input,
      authorId: user.id,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: comment.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
