import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { getChannelForUser, listMessages, markChannelRead } from "@/server/services/chat";
import { ChannelView } from "@/components/site/channel-view";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  await requireModule("communication");
  const { id } = await params;
  const channel = await getChannelForUser(id, {
    id: user.id,
    role: user.role,
    classe: user.student?.classe ?? null,
  }).catch(() => null);
  if (!channel) notFound();

  const messages = await listMessages({
    channelId: id,
    user: { id: user.id, role: user.role, classe: user.student?.classe ?? null },
    limit: 50,
  });
  await markChannelRead(id, user.id);

  return (
    <div className="container-page max-w-4xl py-6 sm:py-10">
      <Link href="/communication" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tous les canaux
      </Link>
      <div className="mt-3">
        <ChannelView
          channelId={channel.id}
          channelName={channel.nom}
          readOnly={channel.readOnly && user.role === "STUDENT"}
          initialMessages={messages.map((message) => ({
            id: message.id,
            contenu: message.contenu,
            imageUrl: message.imageUrl,
            deletedAt: message.deletedAt?.toISOString() ?? null,
            createdAt: message.createdAt.toISOString(),
            author: {
              id: message.author.id,
              role: message.author.role,
              photoUrl: message.author.photoUrl,
              student: message.author.student,
            },
            replyTo: message.replyTo
              ? {
                  id: message.replyTo.id,
                  contenu: message.replyTo.contenu,
                  deletedAt: message.replyTo.deletedAt?.toISOString() ?? null,
                  author: message.replyTo.author,
                }
              : null,
            reactions: message.reactions.map((reaction) => ({
              emoji: reaction.emoji,
              userId: reaction.userId,
            })),
          }))}
          currentUser={{ id: user.id, role: user.role }}
          canModerate={user.role !== "STUDENT"}
        />
      </div>
    </div>
  );
}
