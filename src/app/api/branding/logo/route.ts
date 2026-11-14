import { ApiError, jsonError } from "@/lib/api";
import { getBranding } from "@/lib/branding";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const branding = await getBranding();
    if (!branding.logoKey) {
      throw new ApiError(404, "Aucun logo configuré.", "INTROUVABLE");
    }
    const buffer = await getObject(branding.logoKey);
    return new Response(buffer, {
      headers: {
        "content-type": "image/webp",
        "content-length": String(buffer.length),
        "cache-control": "public, max-age=86400, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
