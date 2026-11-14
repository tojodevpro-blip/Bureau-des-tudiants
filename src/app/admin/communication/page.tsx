import Link from "next/link";
import { Lock, MessageCircle, ShieldAlert } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { activeMutes, listChannelsForAdmin } from "@/server/services/chat";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelForm } from "@/components/admin/channel-form";
import { MuteForm } from "@/components/admin/mute-form";

export const metadata = { title: "Communication" };
export const dynamic = "force-dynamic";

export default async function AdminCommunicationPage() {
  await requireStaffPage();
  await requireModule("communication");
  const [channels, mutes, students] = await Promise.all([
    listChannelsForAdmin(),
    activeMutes(),
    prisma.student.findMany({ distinct: ["classe"], select: { classe: true }, orderBy: { classe: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps">Échanges</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          <MessageCircle className="h-6 w-6 text-brand-700" aria-hidden />
          Communication
        </h1>
        <p className="mt-1 text-sm text-ink-500">Canaux de discussion, modération et blocages temporaires.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Créer un canal</CardTitle></CardHeader>
          <CardContent><ChannelForm availableClasses={students.map((student) => student.classe)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden /> Bloquer un compte</CardTitle></CardHeader>
          <CardContent><MuteForm /></CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-bold text-ink-950">Canaux ({channels.length})</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-ink-900">{channel.nom}</p>
                    {channel.readOnly ? <Badge variant="neutral"><Lock className="h-3 w-3" aria-hidden /> Lecture seule</Badge> : null}
                  </div>
                  <p className="text-xs text-ink-500">
                    {channel.type === "CLASSE" ? `Classe ${channel.classe}` : channel.type} · {channel._count.messages} message(s)
                  </p>
                </div>
                <Link href={`/communication/${channel.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Ouvrir</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink-950">Blocages actifs ({mutes.length})</h2>
        {mutes.length === 0 ? (
          <p className="mt-2 rounded-xl border border-ink-200 bg-white p-4 text-sm text-ink-500">Aucun blocage actif.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {mutes.map((mute) => (
              <Card key={mute.id}>
                <CardContent className="p-4">
                  <p className="font-semibold text-ink-900">{mute.user.email ?? "Compte sans email"}</p>
                  <p className="text-sm text-ink-500">{mute.motif}</p>
                  <p className="text-xs text-ink-400">
                    {mute.until ? `Jusqu’au ${formatDateTime(mute.until)}` : "Permanent"} · par {mute.createdBy.email}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
