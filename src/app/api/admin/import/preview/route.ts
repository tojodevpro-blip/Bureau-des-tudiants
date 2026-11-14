import { assertCsrf, jsonError, jsonOk } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { previewImport } from "@/server/services/import";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    await requireAdminApi();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError(new Error("Fichier manquant"));
    }

    const preview = await previewImport(file);
    return jsonOk(preview);
  } catch (error) {
    return jsonError(error);
  }
}
