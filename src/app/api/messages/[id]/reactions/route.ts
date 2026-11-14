import { assertCsrf, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { reactionSchema } from "@/lib/validation";
import { toggleReaction } from "@/server/services/chat";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    const { id } = await params;
    const input = reactionSchema.parse(await readJson(request));
    const result = await toggleReaction(id, user.id, input.emoji);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
