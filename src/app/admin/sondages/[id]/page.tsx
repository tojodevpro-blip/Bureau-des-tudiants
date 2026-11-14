import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { getPollForAdmin } from "@/server/services/polls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PollStatusActions } from "@/components/admin/poll-status-actions";
import { PollResults } from "@/components/site/poll-results";

export const metadata = { title: "Sondage" };
export const dynamic = "force-dynamic";

export default async function AdminPollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  await requireModule("sondages");
  const { id } = await params;
  const poll = await getPollForAdmin(id).catch(() => null);
  if (!poll) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/sondages" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux sondages
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={poll.statut === "OUVERT" ? "success" : poll.statut === "BROUILLON" ? "neutral" : "warning"}>
              {poll.statut === "OUVERT" ? "Ouvert" : poll.statut === "BROUILLON" ? "Brouillon" : "Clôturé"}
            </Badge>
            {poll.multiple ? <Badge variant="neutral">Choix multiples</Badge> : null}
            <Badge variant="info">{poll.resultatsMode === "IMMEDIAT" ? "Résultats immédiats" : "Résultats après clôture"}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-950">{poll.question}</h1>
          {poll.description ? <p className="mt-1 whitespace-pre-line text-sm text-ink-500">{poll.description}</p> : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{poll._count.participations} participant(s)</span>
            {poll.closesAt ? <span>Clôture {formatDateTime(poll.closesAt)}</span> : <span>Pas de clôture automatique</span>}
            <span>{poll.audienceToutes ? "Toutes les classes" : `Classes : ${poll.classes.join(", ") || "aucune"}`}</span>
          </p>
        </div>
        <div className="shrink-0 space-y-2">
          <PollStatusActions pollId={poll.id} statut={poll.statut} />
          {poll.statut === "OUVERT" ? (
            <Link href={`/sondages/${poll.id}`} className="link-quiet block text-xs">Voir la page étudiante</Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Résultats en direct</CardTitle></CardHeader>
        <CardContent>
          <PollResults
            options={poll.options.map((option) => ({ id: option.id, label: option.label, votes: option._count.ballots }))}
            participations={poll._count.participations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
