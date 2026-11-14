import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BarChart3, CheckCircle2 } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { canSeeResults, getPollForUser } from "@/server/services/polls";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PollVoteForm } from "@/components/site/poll-vote";
import { PollResults } from "@/components/site/poll-results";

export const dynamic = "force-dynamic";

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  if (user.role !== "STUDENT") redirect("/admin/sondages");
  await requireModule("sondages");
  const { id } = await params;
  const poll = await getPollForUser(id, { id: user.id, classe: user.student?.classe ?? null }).catch(() => null);
  if (!poll) notFound();
  const hasVoted = poll.participations.length > 0;
  const open = poll.statut === "OUVERT";
  const showResults = canSeeResults(poll, hasVoted);
  const options = poll.options.map((option) => ({
    id: option.id,
    label: option.label,
    votes: option._count.ballots,
  }));

  return (
    <div className="container-page max-w-2xl py-10 sm:py-14">
      <Link href="/sondages" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux sondages
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={open ? "success" : "neutral"}>{open ? "Ouvert" : "Clôturé"}</Badge>
        {poll.multiple ? <Badge variant="neutral">Choix multiples</Badge> : null}
        {hasVoted ? <Badge variant="info"><CheckCircle2 className="h-3 w-3" aria-hidden /> Répondu</Badge> : null}
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-950">{poll.question}</h1>
      {poll.description ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">{poll.description}</p> : null}
      <p className="mt-2 text-xs text-ink-400">
        {poll._count.participations} participant(s)
        {poll.closesAt ? ` · clôture ${formatDateTime(poll.closesAt)}` : ""}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-brand-700" aria-hidden />
            {open && !hasVoted ? "Ta réponse" : "Résultats"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {open && !hasVoted ? (
            <PollVoteForm pollId={poll.id} multiple={poll.multiple} options={poll.options.map((option) => ({ id: option.id, label: option.label }))} />
          ) : showResults ? (
            <PollResults options={options} participations={poll._count.participations} />
          ) : (
            <Alert variant="info" title="Résultats après clôture">
              Ta réponse a bien été enregistrée. Les résultats seront visibles à la clôture du
              sondage.
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
