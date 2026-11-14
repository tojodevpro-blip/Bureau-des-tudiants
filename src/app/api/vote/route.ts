import { NextResponse } from "next/server";
import {
  assertCsrf,
  getRequestIp,
  jsonError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { requireApprovedStudentApi } from "@/lib/auth/guard";
import { voteSchema } from "@/lib/validation";
import { AlreadyVotedError, castVote } from "@/server/services/voting";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireApprovedStudentApi();
    const body = await readJson(request);
    const input = voteSchema.parse(body);

    const result = await castVote({
      user,
      electionId: input.electionId,
      candidateId: input.candidateId,
      choices: input.choices,
      ip: getRequestIp(request),
    });

    return jsonOk({ votedAt: result.votedAt.toISOString() });
  } catch (error) {
    if (error instanceof AlreadyVotedError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Ton vote a déjà été enregistré. Un seul vote est autorisé.",
            code: "DEJA_VOTE",
          },
          data: { votedAt: error.votedAt.toISOString() },
        },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}
