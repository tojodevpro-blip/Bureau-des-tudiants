import { jsonError } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { exportUserData } from "@/server/services/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUserApi();
    const data = await exportUserData(user.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="bde-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
