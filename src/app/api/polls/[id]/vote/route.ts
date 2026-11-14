import { assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireApprovedStudentApi } from "@/lib/auth/guard";
import { pollVoteSchema } from "@/lib/validation";
import { votePoll } from "@/server/services/polls";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireApprovedStudentApi();
    const { id } = await params;
    const input = pollVoteSchema.parse(await readJson(request));
    await votePoll({
      pollId: id,
      userId: user.id,
      studentId: user.studentId,
      classe: user.student?.classe ?? null,
      optionIds: input.optionIds,
      ip: getRequestIp(request),
    });
    return jsonOk({ voted: true });
  } catch (error) {
    return jsonError(error);
  }
}
