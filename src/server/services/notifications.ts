import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, unsubscribeUrl } from "@/lib/email";

type NotificationInput = {
  userId: string;
  type: string;
  titre: string;
  message: string;
  url?: string | null;
  dedupeKey?: string | null;
  email?: boolean;
};

export async function createNotification(input: NotificationInput) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type.slice(0, 40),
        titre: input.titre.slice(0, 160),
        message: input.message.slice(0, 800),
        url: input.url?.slice(0, 500) ?? null,
        dedupeKey: input.dedupeKey?.slice(0, 200) ?? null,
      },
    });

    if (input.email !== false) {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, notificationsEmail: true },
      });
      if (user?.email && user.notificationsEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const sent = await sendEmail({
          to: user.email,
          subject: input.titre,
          html: `<p>${escapeHtml(input.message)}</p>${
            input.url ? `<p><a href="${appUrl}${input.url}">Ouvrir dans la plateforme</a></p>` : ""
          }`,
          text: input.message,
          unsubscribeUrl: unsubscribeUrl(input.userId),
        });
        if (sent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSentAt: new Date() },
          });
        }
      }
    }

    return notification;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.dedupeKey
    ) {
      return null;
    }
    console.error("Notification non créée", error);
    return null;
  }
}

export async function notifyUsers(
  userIds: string[],
  input: Omit<NotificationInput, "userId">,
) {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((userId) => createNotification({ ...input, userId })));
}

export async function notifyClassOrAll(
  target: { classes: string[]; toutes: boolean },
  input: Omit<NotificationInput, "userId">,
) {
  const users = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      statut: "APPROUVE",
      student: {
        actif: true,
        ...(target.toutes ? {} : { classe: { in: target.classes } }),
      },
    },
    select: { id: true },
  });
  await notifyUsers(
    users.map((user) => user.id),
    input,
  );
}

export async function listNotifications(userId: string, page = 1, pageSize = 20) {
  const take = Math.min(Math.max(pageSize, 1), 50);
  const skip = (Math.max(page, 1) - 1) * take;
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, total, unread, page: Math.max(page, 1), pageSize: take };
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, id: string) {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function setNotificationPreference(userId: string, enabled: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { notificationsEmail: enabled },
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
