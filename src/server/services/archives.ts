import "server-only";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import {
  deleteObject,
  signedStorageUrl,
  uploadDocument,
  uploadImage,
} from "@/lib/storage";
import { sanitizePlainText } from "@/lib/sanitize";
import { createNotification } from "@/server/services/notifications";

export async function listAlbums(options: { annee?: number; eventId?: string } = {}) {
  const albums = await prisma.album.findMany({
    where: {
      ...(options.annee ? { annee: options.annee } : {}),
      ...(options.eventId ? { eventId: options.eventId } : {}),
    },
    orderBy: [{ annee: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { media: { where: { masque: false } } } },
      media: {
        where: { masque: false },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { thumbKey: true, storageKey: true },
      },
    },
  });
  return Promise.all(
    albums.map(async (album) => ({
      ...album,
      coverUrl:
        album.media[0]?.thumbKey || album.media[0]?.storageKey
          ? await signedStorageUrl(album.media[0].thumbKey ?? album.media[0].storageKey, {
              expiresIn: 3600,
            })
          : null,
    })),
  );
}

export async function getAlbumForUser(id: string, includeMasked = false) {
  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      media: {
        where: includeMasked ? {} : { masque: false },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { tags: true } } },
      },
    },
  });
  if (!album) throw new ApiError(404, "Album introuvable.", "INTROUVABLE");
  const media = await Promise.all(
    album.media.map(async (item) => ({
      ...item,
      thumbUrl: item.thumbKey ? await signedStorageUrl(item.thumbKey, { expiresIn: 3600 }) : null,
      fullUrl: await signedStorageUrl(item.storageKey, { expiresIn: 3600 }),
      downloadUrl: await signedStorageUrl(item.storageKey, {
        expiresIn: 3600,
        download: item.nom,
      }),
    })),
  );
  return { ...album, media };
}

export async function createAlbum(
  input: { titre: string; description?: string | null; annee: number; eventId?: string | null },
  actorId: string,
  ip: string,
) {
  const album = await prisma.album.create({
    data: {
      titre: sanitizePlainText(input.titre, 160),
      description: input.description ? sanitizePlainText(input.description, 2000) : null,
      annee: input.annee,
      eventId: input.eventId || null,
      createdById: actorId,
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "ALBUM_CREE",
    details: { albumId: album.id },
    ip,
  });
  return album;
}

export async function uploadAlbumMedia(albumId: string, file: File, actorId: string, ip: string) {
  const album = await prisma.album.findUnique({ where: { id: albumId } });
  if (!album) throw new ApiError(404, "Album introuvable.", "INTROUVABLE");
  const image = await uploadImage(file, `albums/${albumId}`, { maxWidth: 2400, thumb: true });
  const media = await prisma.albumMedia.create({
    data: {
      albumId,
      storageKey: image.key,
      thumbKey: image.thumbKey,
      nom: sanitizePlainText(file.name, 200) || "photo",
      typeMime: image.mime,
      taille: image.size,
      largeur: image.width,
      hauteur: image.height,
      uploadedById: actorId,
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "PHOTO_AJOUTEE",
    details: { albumId, mediaId: media.id },
    ip,
  });
  return media;
}

export async function maskMedia(input: {
  mediaId: string;
  masque: boolean;
  motif?: string | null;
  actorId: string;
  ip: string;
}) {
  const media = await prisma.albumMedia.findUnique({
    where: { id: input.mediaId },
    include: { album: { select: { titre: true } } },
  });
  if (!media) throw new ApiError(404, "Photo introuvable.", "INTROUVABLE");
  const updated = await prisma.albumMedia.update({
    where: { id: input.mediaId },
    data: {
      masque: input.masque,
      masqueParId: input.masque ? input.actorId : null,
      motifMasque: input.masque ? sanitizePlainText(input.motif ?? "Signalement", 300) : null,
    },
  });
  if (input.masque && media.uploadedById !== input.actorId) {
    await createNotification({
      userId: media.uploadedById,
      type: "ARCHIVES",
      titre: "Une photo a été masquée",
      message: `Album ${media.album.titre} · ${media.nom}`,
      url: `/admin/archives/${media.albumId}`,
      dedupeKey: `photo-masquee:${media.id}:${Date.now()}`,
      email: false,
    });
  }
  await logAudit({
    acteur: input.actorId,
    userId: input.actorId,
    action: input.masque ? "PHOTO_MASQUEE" : "PHOTO_REAFFICHEE",
    details: { mediaId: input.mediaId, motif: input.motif ?? null },
    ip: input.ip,
  });
  return updated;
}

export async function tagSelf(mediaId: string, userId: string, studentId: string | null) {
  const media = await prisma.albumMedia.findUnique({
    where: { id: mediaId },
    select: { id: true, masque: true },
  });
  if (!media || media.masque) throw new ApiError(404, "Photo introuvable.", "INTROUVABLE");
  await prisma.photoTag.upsert({
    where: { mediaId_userId: { mediaId, userId } },
    create: { mediaId, userId, studentId },
    update: {},
  });
}

export async function untagSelf(mediaId: string, userId: string) {
  await prisma.photoTag.deleteMany({ where: { mediaId, userId } });
}

export async function listDocuments(options: { categorie?: string } = {}) {
  const documents = await prisma.document.findMany({
    where: options.categorie ? { categorie: options.categorie } : {},
    orderBy: { dateDocument: "desc" },
    include: { createdBy: { select: { email: true } } },
  });
  return Promise.all(
    documents.map(async (document) => ({
      ...document,
      downloadUrl: await signedStorageUrl(document.storageKey, {
        expiresIn: 3600,
        download: document.nom,
      }),
    })),
  );
}

export async function listDocumentsForAdmin() {
  const documents = await prisma.document.findMany({
    orderBy: { dateDocument: "desc" },
    include: { createdBy: { select: { email: true } } },
  });
  return Promise.all(
    documents.map(async (document) => ({
      ...document,
      downloadUrl: await signedStorageUrl(document.storageKey, {
        expiresIn: 3600,
        download: document.nom,
      }),
    })),
  );
}

export async function createDocument(input: {
  titre: string;
  description?: string | null;
  categorie: string;
  dateDocument: Date;
  file: File;
  actorId: string;
  ip: string;
}) {
  const stored = await uploadDocument(input.file, "documents");
  const document = await prisma.document.create({
    data: {
      titre: sanitizePlainText(input.titre, 180),
      description: input.description ? sanitizePlainText(input.description, 2000) : null,
      categorie: sanitizePlainText(input.categorie, 60),
      storageKey: stored.key,
      nom: sanitizePlainText(input.file.name, 200) || "document",
      typeMime: stored.mime,
      taille: stored.size,
      dateDocument: input.dateDocument,
      createdById: input.actorId,
    },
  });
  await logAudit({
    acteur: input.actorId,
    userId: input.actorId,
    action: "DOCUMENT_AJOUTE",
    details: { documentId: document.id },
    ip: input.ip,
  });
  return document;
}

export async function deleteDocument(id: string, actorId: string, ip: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) throw new ApiError(404, "Document introuvable.", "INTROUVABLE");
  await deleteObject(document.storageKey);
  await prisma.document.delete({ where: { id } });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "DOCUMENT_SUPPRIME",
    details: { documentId: id, nom: document.nom },
    ip,
  });
}
