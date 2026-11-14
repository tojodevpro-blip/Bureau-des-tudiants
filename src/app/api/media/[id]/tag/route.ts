import { assertCsrf, jsonError, jsonOk } from "@/lib/api";
import { requireApprovedStudentApi } from "@/lib/auth/guard";
import { tagSelf, untagSelf } from "@/server/services/archives";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireApprovedStudentApi();
    const { id } = await params;
    await tagSelf(id, user.id, user.studentId);
    return jsonOk({ tagged: true });
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
    const user = await requireApprovedStudentApi();
    const { id } = await params;
    await untagSelf(id, user.id);
    return jsonOk({ untagged: true });
  } catch (error) {
    return jsonError(error);
  }
}
