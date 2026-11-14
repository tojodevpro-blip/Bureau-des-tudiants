import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "@/lib/api";
import { isSafeStorageKey } from "@/lib/storage-key";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_CHAT_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function s3Config() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

let cachedClient: S3Client | null = null;

function s3() {
  const config = s3Config();
  if (!config) return null;
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return { client: cachedClient, bucket: config.bucket };
}

export function isObjectStorageConfigured() {
  return Boolean(s3Config());
}

function signingSecret() {
  const secret = process.env.FILE_SIGNING_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Secret de signature de fichiers manquant.");
  return secret;
}

export function signStorageKey(key: string, expiresAt: number) {
  return createHmac("sha256", signingSecret())
    .update(`${key}|${expiresAt}`)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyStorageSignature(key: string, expiresAt: number, signature: string) {
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(signStorageKey(key, expiresAt), signature);
}

export function newStorageKey(prefix: string, extension: string) {
  const safePrefix = prefix.replace(/[^a-z0-9/_-]/gi, "");
  const safeExtension = extension.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return `${safePrefix}/${randomUUID()}${safeExtension ? `.${safeExtension}` : ""}`;
}

async function putLocal(key: string, buffer: Buffer) {
  const filePath = localPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
}

function localPath(key: string) {
  if (!isSafeStorageKey(key)) {
    throw new ApiError(400, "Clé de fichier invalide.", "FICHIER_INVALIDE");
  }
  const root = path.resolve(LOCAL_ROOT);
  const resolved = path.resolve(root, ...key.split("/"));
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ApiError(400, "Clé de fichier invalide.", "FICHIER_INVALIDE");
  }
  return resolved;
}

export async function putObject(key: string, buffer: Buffer, contentType: string) {
  const target = s3();
  if (target) {
    await target.client.send(
      new PutObjectCommand({
        Bucket: target.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "private, max-age=3600",
      }),
    );
    return;
  }
  await putLocal(key, buffer);
}

export async function getObject(key: string) {
  const target = s3();
  if (target) {
    const result = await target.client.send(
      new GetObjectCommand({ Bucket: target.bucket, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new ApiError(404, "Fichier introuvable.", "FICHIER_INTROUVABLE");
    return Buffer.from(bytes);
  }
  try {
    return await readFile(localPath(key));
  } catch {
    throw new ApiError(404, "Fichier introuvable.", "FICHIER_INTROUVABLE");
  }
}

export async function deleteObject(key: string) {
  const target = s3();
  if (target) {
    await target.client
      .send(new DeleteObjectCommand({ Bucket: target.bucket, Key: key }))
      .catch(() => undefined);
    return;
  }
  await unlink(localPath(key)).catch(() => undefined);
}

export async function signedStorageUrl(key: string, options?: { expiresIn?: number; download?: string }) {
  const expiresAt = Date.now() + Math.min(60 * 60 * 24, Math.max(60, options?.expiresIn ?? 3600)) * 1000;
  const target = s3();
  if (target) {
    return getSignedUrl(
      target.client,
      new GetObjectCommand({
        Bucket: target.bucket,
        Key: key,
        ResponseContentDisposition: options?.download
          ? `attachment; filename="${options.download.replace(/["\r\n]/g, "")}"`
          : undefined,
      }),
      { expiresIn: Math.ceil((expiresAt - Date.now()) / 1000) },
    );
  }
  const params = new URLSearchParams({
    expires: String(expiresAt),
    sig: signStorageKey(key, expiresAt),
  });
  if (options?.download) params.set("download", options.download);
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}?${params}`;
}

export async function validateUpload(
  file: File,
  kind: "image" | "document" | "chat-image",
): Promise<{ buffer: Buffer; mime: string; extension: string }> {
  const limit = kind === "document" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0) throw new ApiError(400, "Le fichier est vide.", "FICHIER_VIDE");
  if (file.size > limit) {
    throw new ApiError(413, "Fichier trop volumineux.", "FICHIER_TROP_LOURD");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  const mime = detected?.mime ?? file.type ?? "application/octet-stream";

  if (kind === "document") {
    if (!DOCUMENT_TYPES.has(mime)) {
      throw new ApiError(400, "Format refusé. Utilise un PDF, DOCX ou XLSX.", "TYPE_FICHIER");
    }
  } else if (!IMAGE_TYPES.has(mime)) {
    throw new ApiError(400, "Format d’image refusé. Utilise JPEG, PNG, WebP ou GIF.", "TYPE_FICHIER");
  }

  if (kind === "chat-image" && buffer.length > 3 * 1024 * 1024) {
    throw new ApiError(413, "Image trop volumineuse pour le chat (3 Mo maximum).", "FICHIER_TROP_LOURD");
  }

  return { buffer, mime, extension: detected?.ext ?? mime.split("/")[1] ?? "bin" };
}

export async function uploadImage(
  file: File,
  prefix: string,
  options?: { maxWidth?: number; thumb?: boolean },
) {
  const { buffer, mime, extension } = await validateUpload(file, "image");
  const image = sharp(buffer, { failOn: "error" }).rotate();
  const metadata = await image.metadata();
  const maxWidth = options?.maxWidth ?? 2000;
  const optimized = await image
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = newStorageKey(prefix, "webp");
  await putObject(key, optimized, "image/webp");

  let thumbKey: string | null = null;
  if (options?.thumb !== false) {
    const thumb = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width: 520, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    thumbKey = newStorageKey(`${prefix}/thumbs`, "webp");
    await putObject(thumbKey, thumb, "image/webp");
  }

  return {
    key,
    thumbKey,
    mime: "image/webp",
    originalMime: mime,
    extension,
    size: optimized.length,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  };
}

export async function uploadDocument(file: File, prefix: string) {
  const { buffer, mime, extension } = await validateUpload(file, "document");
  if (mime === "application/pdf") {
    if (buffer.subarray(0, 5).toString() !== "%PDF-") {
      throw new ApiError(400, "Le PDF est invalide.", "TYPE_FICHIER");
    }
  }
  const key = newStorageKey(prefix, extension);
  await putObject(key, buffer, mime);
  return { key, mime, size: buffer.length };
}
