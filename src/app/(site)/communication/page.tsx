import Link from "next/link";
import { Lock, MessageCircle } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatShortDateTime } from "@/lib/utils";
import { listChannels } from "@/server/services/chat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Communication" };
export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const user = await requireUserPage();
  await requireModule("communication");
  const channels = await listChannels({
    id: user.id,
    role: user.role,
    classe: user.student?.classe ?? null,
  });

  return (
    <div className="container-page py-10 sm:py-14">
      <p className="label-caps">Échanges</p>
      <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
        <MessageCircle className="h-7 w-7 text-brand-700" aria-hidden />
        Communication
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Les canaux du BDE : général, annonces et discussions de classe. Reste respectueux.
      </p>

      {channels.length === 0 ? (
        <EmptyState className="mt-6" icon={<MessageCircle className="h-10 w-10" />} title="Aucun canal" description="Les canaux seront disponibles prochainement." />
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {channels.map((channel) => (
            <Link key={channel.id} href={`/communication/${channel.id}`} className="surface flex items-start gap-3 p-5 transition hover:border-brand-200">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {channel.readOnly ? <Lock className="h-5 w-5" aria-hidden /> : <MessageCircle className="h-5 w-5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-ink-950">{channel.nom}</h2>
                  {channel.unread > 0 ? <Badge variant="brand">{channel.unread}</Badge> : null}
                  {channel.readOnly ? <Badge variant="neutral">Lecture seule</Badge> : null}
                </div>
                <p className="mt-1 truncate text-sm text-ink-500">
                  {channel.lastMessage
                    ? `${channel.lastMessage.deletedAt ? "Message supprimé" : channel.lastMessage.contenu ?? "Image"} · ${formatShortDateTime(channel.lastMessage.createdAt)}`
                    : "Aucun message"}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  {channel.type === "CLASSE" ? `Classe ${channel.classe}` : channel.type === "ANNONCES" ? "Annonces officielles" : channel._count.messages + " message(s)"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {user.role !== "STUDENT" ? (
        <p className="mt-6 text-sm text-ink-500">
          En tant que membre du BDE, tu peux gérer les canaux et les blocages depuis{" "}
          <Link href="/admin/communication" className="font-semibold text-brand-700 underline underline-offset-2">l’espace BDE</Link>.
        </p>
      ) : null}
    </div>
  );
}
