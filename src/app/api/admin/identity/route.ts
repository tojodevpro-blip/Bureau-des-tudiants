import { revalidatePath } from "next/cache";
import { ApiError, assertCsrf, getRequestIp, jsonError, jsonOk } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/guard";
import { identitySchema } from "@/lib/validation";
import { BRANDING_KEYS, getBranding } from "@/lib/branding";
import { setSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { deleteObject, uploadImage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const admin = await requireAdminApi();
    const form = await request.formData();

    const input = identitySchema.parse({
      nom: String(form.get("nom") ?? ""),
      nomCourt: String(form.get("nomCourt") ?? ""),
      slogan: String(form.get("slogan") ?? ""),
      logoUrl: String(form.get("logoUrl") ?? "").trim() || null,
    });

    const current = await getBranding();
    const removeLogo = String(form.get("removeLogo") ?? "") === "true";
    const file = form.get("logo");
    const logoFile = file instanceof File && file.size > 0 ? file : null;
    if (logoFile && logoFile.size > 8 * 1024 * 1024) {
      throw new ApiError(413, "Le logo ne doit pas dépasser 8 Mo.", "FICHIER_TROP_LOURD");
    }

    let nextLogoKey = current.logoKey;
    let nextLogoUrl = current.logoUrl.startsWith("/api/branding/logo") ? "" : input.logoUrl ?? current.logoUrl;
    let logoVersion = String(Date.now());

    if (logoFile) {
      const uploaded = await uploadImage(logoFile, "identite", { maxWidth: 1200, thumb: false });
      if (current.logoKey) await deleteObject(current.logoKey);
      nextLogoKey = uploaded.key;
      nextLogoUrl = "";
    } else if (removeLogo) {
      if (current.logoKey) await deleteObject(current.logoKey);
      nextLogoKey = "";
      nextLogoUrl = "";
    } else if (input.logoUrl !== undefined) {
      if (current.logoKey && input.logoUrl !== current.logoUrl) {
        await deleteObject(current.logoKey);
        nextLogoKey = "";
      }
      nextLogoUrl = input.logoUrl ?? "";
    }

    await Promise.all([
      setSetting(BRANDING_KEYS.name, input.nom),
      setSetting(BRANDING_KEYS.shortName, input.nomCourt),
      setSetting(BRANDING_KEYS.tagline, input.slogan),
      setSetting(BRANDING_KEYS.logoKey, nextLogoKey),
      setSetting(BRANDING_KEYS.logoUrl, nextLogoUrl),
      setSetting(BRANDING_KEYS.logoVersion, logoVersion),
    ]);
    revalidatePath("/", "layout");

    await logAudit({
      acteur: admin.id,
      action: "IDENTITE_MODIFIEE",
      details: {
        nom: input.nom,
        nomCourt: input.nomCourt,
        logo: logoFile ? "televerse" : nextLogoKey ? "conserve" : nextLogoUrl ? "externe" : "retire",
      },
      ip: getRequestIp(request),
    });

    return jsonOk(await getBranding());
  } catch (error) {
    return jsonError(error);
  }
}
