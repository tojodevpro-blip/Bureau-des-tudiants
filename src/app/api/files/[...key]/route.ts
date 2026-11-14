import { fileTypeFromBuffer } from "file-type";
import { getObject, verifyStorageSignature } from "@/lib/storage";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    const { key: segments } = await params;
    const key = segments.map((segment) => decodeURIComponent(segment)).join("/");
    const url = new URL(request.url);
    const expires = Number(url.searchParams.get("expires"));
    const signature = url.searchParams.get("sig") ?? "";
    if (!verifyStorageSignature(key, expires, signature)) {
      return new Response("Lien expiré ou invalide.", { status: 403 });
    }

    const buffer = await getObject(key);
    const detected = await fileTypeFromBuffer(buffer);
    const download = url.searchParams.get("download");
    return new Response(buffer, {
      headers: {
        "content-type": detected?.mime ?? "application/octet-stream",
        "content-length": String(buffer.length),
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
        ...(download
          ? { "content-disposition": `attachment; filename="${download.replace(/["\r\n]/g, "")}"` }
          : {}),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
