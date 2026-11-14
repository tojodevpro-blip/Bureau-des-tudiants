import { ApiError, assertCsrf, getRequestIp, jsonError, jsonOk, readJson } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/guard";
import { profileSchema } from "@/lib/validation";
import { updateProfile } from "@/server/services/profile";

export async function PATCH(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUserApi();
    if (user.role === "STUDENT") {
      throw new ApiError(
        403,
        "Les informations de ton compte étudiant sont gérées par le BDE. Tu peux uniquement changer ton mot de passe.",
        "PROFIL_VERROUILLE",
      );
    }
    const input = profileSchema.parse(await readJson(request));
    await updateProfile(user.id, input, getRequestIp(request));
    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error);
  }
}
