import "server-only";

import type { ChannelType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";
import { deleteObject, signedStorageUrl, uploadImage } from "@/lib/storage";
import { consumeAttempt, rateLimitKey } from "@/lib/rate-limit";

const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "🎉", "👏"]);

export async function ensureDefaultChannels() {
  const defaults: { nom: string; slug: string; type: ChannelType; readOnly: boolean }[] = [
    { nom: "Général", slug: "general", type: "GENERAL", readOnly: false },
    { nom: "Annonces BDE", slug: "annonces", type: "ANNONCES", readOnly: true },
  ];
  for (const channel of defaults) {
    await prisma.channel.upsert({
      where: { slug: channel.slug },
      create: channel,
      update: {},
    });
  }
}

export async function listChannels(user: {
  id: string;
  role: "STUDENT" | "MEMBRE_BDE" | "ADMIN";
  classe: string | null;
}) {
  await ensureDefaultChannels();
  const staff = user.role !== "STUDENT";
  const channels = await prisma.channel.findMany({
    where: staff
      ? {}
      : {
          OR: [
            { type: "GENERAL" },
            { type: "ANNONCES" },
            ...(user.classe ? [{ type: "CLASSE" as ChannelType, classe: user.classe }] : []),
          ],
        },
    orderBy: [{ type: "asc" }, { nom: "asc" }],
    include: {
      reads: { where: { userId: user.id }, select: { lastReadAt: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { contenu: true, createdAt: true, authorId: true, deletedAt: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return Promise.all(
    channels.map(async (channel) => {
      const lastReadAt = channel.reads[0]?.lastReadAt ?? null;
      const unread = await prisma.message.count({
        where: {
          channelId: channel.id,
          deletedAt: null,
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return {
        ...channel,
        unread,
        lastMessage: channel.messages[0] ?? null,
      };
    }),
  );
}

export async function getChannelForUser(
  id: string,
  user: { id: string; role: "STUDENT" | "MEMBRE_BDE" | "ADMIN"; classe: string | null },
) {
  await ensureDefaultChannels();
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      reads: { where: { userId: user.id }, select: { lastReadAt: true } },
    },
  });
  if (!channel) throw new ApiError(404, "Canal introuvable.", "INTROUVABLE");
  const staff = user.role !== "STUDENT";
  const allowed =
    staff ||
    channel.type === "GENERAL" ||
    channel.type === "ANNONCES" ||
    (channel.type === "CLASSE" && channel.classe === user.classe);
  if (!allowed) throw new ApiError(403, "Ce canal ne t’est pas accessible.", "ACCES_REFUSE");
  return channel;
}

export async function listMessages(input: {
  channelId: string;
  user: { id: string; role: "STUDENT" | "MEMBRE_BDE" | "ADMIN"; classe: string | null };
  before?: string;
  limit?: number;
}) {
  await getChannelForUser(input.channelId, input.user);
  const limit = Math.min(80, Math.max(10, input.limit ?? 50));
  const messages = await prisma.message.findMany({
    where: {
      channelId: input.channelId,
      ...(input.before ? { createdAt: { lt: new Date(input.before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          role: true,
          photoUrl: true,
          student: { select: { prenoms: true, nom: true } },
        },
      },
      replyTo: {
        select: {
          id: true,
          contenu: true,
          deletedAt: true,
          author: {
            select: { student: { select: { prenoms: true, nom: true } }, email: true },
          },
        },
      },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  return Promise.all(
    messages.reverse().map(async (message) => ({
      ...message,
      imageUrl: message.imageKey
        ? await signedStorageUrl(message.imageKey, { expiresIn: 3600 })
        : null,
    })),
  );
}

export async function sendMessage(input: {
  channelId: string;
  author: { id: string; role: "STUDENT" | "MEMBRE_BDE" | "ADMIN"; classe: string | null };
  contenu: string | null;
  image: File | null;
  replyToId: string | null;
  ip: string;
}) {
  const channel = await getChannelForUser(input.channelId, input.author);
  if (channel.readOnly && input.author.role === "STUDENT") {
    throw new ApiError(403, "Ce canal est en lecture seule.", "CANAL_LECTURE_SEULE");
  }
  const mute = await prisma.mute.findFirst({
    where: {
      userId: input.author.id,
      OR: [{ until: null }, { until: { gt: new Date() } }],
    },
  });
  if (mute) throw new ApiError(403, "Tu es temporairement bloqué du chat.", "MUTE_ACTIF");

  await consumeAttempt(rateLimitKey("chat:user", input.author.id), 12, 60 * 1000);
  await consumeAttempt(rateLimitKey("chat:ip", input.ip), 30, 60 * 1000);

  const text = input.contenu ? sanitizePlainText(input.contenu, 3000) : "";
  if (!text && !input.image) throw new ApiError(400, "Message vide.", "VALIDATION");

  if (input.replyToId) {
    const parent = await prisma.message.findUnique({
      where: { id: input.replyToId },
      select: { channelId: true },
    });
    if (!parent || parent.channelId !== input.channelId) {
      throw new ApiError(400, "Message cité invalide.", "VALIDATION");
    }
  }

  let imageKey: string | null = null;
  if (input.image) {
    const uploaded = await uploadImage(input.image, `chat/${input.channelId}`, {
      maxWidth: 1600,
      thumb: false,
    });
    imageKey = uploaded.key;
  }

  try {
    const message = await prisma.message.create({
      data: {
        channelId: input.channelId,
        authorId: input.author.id,
        contenu: text || null,
        imageKey,
        replyToId: input.replyToId || null,
      },
    });
    await prisma.channelRead.upsert({
      where: { channelId_userId: { channelId: input.channelId, userId: input.author.id } },
      create: { channelId: input.channelId, userId: input.author.id },
      update: { lastReadAt: new Date() },
    });
    return message;
  } catch (error) {
    if (imageKey) await deleteObject(imageKey);
    throw error;
  }
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  if (!ALLOWED_REACTIONS.has(emoji)) throw new ApiError(400, "Réaction invalide.", "VALIDATION");
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, channelId: true, deletedAt: true },
  });
  if (!message || message.deletedAt) throw new ApiError(404, "Message introuvable.", "INTROUVABLE");
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return { active: false };
  }
  await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
  return { active: true };
}

export async function deleteMessage(input: {
  messageId: string;
  actor: { id: string; role: "STUDENT" | "MEMBRE_BDE" | "ADMIN" };
  ip: string;
}) {
  const message = await prisma.message.findUnique({ where: { id: input.messageId } });
  if (!message) throw new ApiError(404, "Message introuvable.", "INTROUVABLE");
  if (message.authorId !== input.actor.id && input.actor.role === "STUDENT") {
    throw new ApiError(403, "Tu ne peux supprimer que tes messages.", "ACCES_REFUSE");
  }
  if (message.imageKey) await deleteObject(message.imageKey);
  await prisma.message.update({
    where: { id: input.messageId },
    data: {
      deletedAt: new Date(),
      deletedById: input.actor.id,
      contenu: null,
      imageKey: null,
    },
  });
  await logAudit({
    acteur: input.actor.id,
    userId: input.actor.id,
    action: "MESSAGE_SUPPRIME",
    details: { messageId: input.messageId, auteur: message.authorId },
    ip: input.ip,
  });
}

export async function markChannelRead(channelId: string, userId: string) {
  await prisma.channelRead.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId },
    update: { lastReadAt: new Date() },
  });
}

export async function createChannel(
  input: { nom: string; type: ChannelType; classe?: string | null; readOnly?: boolean },
  actorId: string,
  ip: string,
) {
  const slugBase = input.nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const slug = `${slugBase || "canal"}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = await prisma.channel.create({
    data: {
      nom: sanitizePlainText(input.nom, 80),
      slug,
      type: input.type,
      classe: input.type === "CLASSE" ? input.classe || null : null,
      readOnly: Boolean(input.readOnly),
      createdById: actorId,
    },
  });
  await logAudit({
    acteur: actorId,
    userId: actorId,
    action: "CANAL_CREE",
    details: { channelId: channel.id, nom: channel.nom },
    ip,
  });
  return channel;
}

export async function listChannelsForAdmin() {
  await ensureDefaultChannels();
  return prisma.channel.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { messages: true } },
      createdBy: { select: { email: true } },
    },
  });
}

export async function muteUser(input: {
  email: string;
  motif: string;
  until: Date | null;
  actorId: string;
  ip: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
    select: { id: true, role: true },
  });
  if (!user) throw new ApiError(404, "Aucun compte avec cet email.", "INTROUVABLE");
  if (user.role === "ADMIN") throw new ApiError(400, "Un administrateur ne peut être bloqué.", "VALIDATION");
  const mute = await prisma.mute.create({
    data: {
      userId: user.id,
      motif: sanitizePlainText(input.motif, 300),
      until: input.until,
      createdById: input.actorId,
    },
  });
  await logAudit({
    acteur: input.actorId,
    userId: input.actorId,
    action: "UTILISATEUR_MUTE",
    details: { cible: user.id, until: input.until },
    ip: input.ip,
  });
  return mute;
}

export async function activeMutes() {
  return prisma.mute.findMany({
    where: { OR: [{ until: null }, { until: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true } },
      createdBy: { select: { email: true } },
    },
  });
}
