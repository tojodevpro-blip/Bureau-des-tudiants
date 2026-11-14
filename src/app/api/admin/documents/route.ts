import { ApiError, assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireStaffApi } from "@/lib/auth/guard";
import { documentSchema } from "@/lib/validation";
import { createDocument } from "@/server/services/archives";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const staff = await requireStaffApi();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Aucun fichier reçu.", "FICHIER_MANQUANT");
    }
    const input = documentSchema.parse({
      titre: form.get("titre"),
      description: form.get("description") || null,
      categorie: form.get("categorie"),
      dateDocument: form.get("dateDocument"),
    });
    if (!input.dateDocument) {
      throw new ApiError(400, "Date du document requise.", "VALIDATION");
    }
    const document = await createDocument({
      ...input,
      dateDocument: input.dateDocument,
      file,
      actorId: staff.id,
      ip: getRequestIp(request),
    });
    return jsonOk({ id: document.id }, 201);
  } catch (error) {
    return jsonError(error);
  }
}
