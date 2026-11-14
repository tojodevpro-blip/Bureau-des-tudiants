import Link from "next/link";
import { Award, BarChart3, CalendarDays, LockKeyhole, Users } from "lucide-react";
import { getPublishedResults } from "@/server/services/results";
import { getCurrentElection } from "@/server/services/elections";
import { ELECTION_STATUS_LABELS } from "@/lib/election-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ProgressBar } from "@/components/ui/empty-state";
import { formatDateTime, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Résultats" };

export default async function ResultsPage() {
  const results = await getPublishedResults();

  if (!results) {
    const current = await getCurrentElection();
    return (
      <div className="container-page py-14">
        <EmptyState
          icon={<LockKeyhole className="h-10 w-10" />}
          title="Résultats non publiés"
          description={
            current
              ? `L’élection « ${current.titre} » est au statut ${ELECTION_STATUS_LABELS[current.statut].toLowerCase()}. Les résultats seront affichés après la clôture et la publication officielle par le BDE.`
              : "Aucun résultat n’est disponible pour le moment. Les résultats sont publiés uniquement après la clôture du scrutin."
          }
          action={
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Retour à l’accueil
            </Link>
          }
        />
      </div>
    );
  }

  const multiPost = results.positions.length > 0;
  const winner = multiPost ? null : results.classement[0];

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Badge variant="success">Résultats officiels</Badge>
          <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
            {results.election.titre}
          </h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Publiés le {formatDateTime(results.genereLe)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden />
              {results.votants} votant(s) sur {results.inscrits} inscrit(s)
            </span>
          </p>
        </div>
        {winner ? (
          <div className="surface flex items-center gap-3 p-4">
            <span className="rounded-xl bg-accent-100 p-2.5 text-accent-700">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                En tête
              </p>
              <p className="font-bold text-ink-950">{winner.candidate.nomAffiche}</p>
            </div>
          </div>
        ) : (
          <div className="surface flex items-center gap-3 p-4">
            <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Scrutin
              </p>
              <p className="font-bold text-ink-950">{results.positions.length} poste(s)</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Participation
            </p>
            <p className="text-2xl font-bold text-ink-950">
              {formatPercent(results.participation)}
            </p>
            <ProgressBar value={results.participation} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Bulletins exprimés
            </p>
            <p className="text-2xl font-bold text-ink-950">{results.totalVotes}</p>
            <p className="text-xs text-ink-500">hors bulletins non enregistrés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Votes blancs
            </p>
            <p className="text-2xl font-bold text-ink-950">{results.blancs}</p>
            <p className="text-xs text-ink-500">{formatPercent(results.blancsPourcentage)}</p>
          </CardContent>
        </Card>
      </div>

      {multiPost ? (
        <div className="mt-6 space-y-4">
          {results.positions.map((positionResult) => (
            <Card key={positionResult.position.id}>
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-700" aria-hidden />
                  <h2 className="text-lg font-bold text-ink-950">
                    {positionResult.position.titre}
                  </h2>
                </div>
                <ol className="space-y-5">
                  {positionResult.classement.map((entry, index) => (
                    <li key={entry.candidate.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                            {index + 1}
                          </span>
                          <span className="truncate font-semibold text-ink-900">
                            {entry.candidate.nomAffiche}
                          </span>
                          {index === 0 && entry.votes > 0 ? (
                            <Badge variant="warning">1er</Badge>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-ink-500">
                          <strong className="text-ink-900">{entry.votes}</strong> voix ·{" "}
                          {formatPercent(entry.pourcentage)}
                        </span>
                      </div>
                      <ProgressBar
                        value={entry.pourcentage}
                        barClassName={index === 0 ? "bg-brand-600" : "bg-brand-400"}
                      />
                    </li>
                  ))}
                  <li className="space-y-2 border-t border-ink-100 pt-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-ink-700">Vote blanc</span>
                      <span className="text-ink-500">
                        <strong className="text-ink-900">{positionResult.blancs}</strong> voix ·{" "}
                        {formatPercent(positionResult.blancsPourcentage)}
                      </span>
                    </div>
                    <ProgressBar
                      value={positionResult.blancsPourcentage}
                      barClassName="bg-ink-400"
                    />
                  </li>
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-700" aria-hidden />
              <h2 className="text-lg font-bold text-ink-950">Classement</h2>
            </div>
            <ol className="space-y-5">
              {results.classement.map((entry, index) => (
                <li key={entry.candidate.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                        {index + 1}
                      </span>
                      <span className="truncate font-semibold text-ink-900">
                        {entry.candidate.nomAffiche}
                      </span>
                      {index === 0 && entry.votes > 0 ? (
                        <Badge variant="warning">1er</Badge>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-ink-500">
                      <strong className="text-ink-900">{entry.votes}</strong> voix ·{" "}
                      {formatPercent(entry.pourcentage)}
                    </span>
                  </div>
                  <ProgressBar
                    value={entry.pourcentage}
                    barClassName={index === 0 ? "bg-brand-600" : "bg-brand-400"}
                  />
                </li>
              ))}
              <li className="space-y-2 border-t border-ink-100 pt-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-ink-700">Vote blanc</span>
                  <span className="text-ink-500">
                    <strong className="text-ink-900">{results.blancs}</strong> voix ·{" "}
                    {formatPercent(results.blancsPourcentage)}
                  </span>
                </div>
                <ProgressBar value={results.blancsPourcentage} barClassName="bg-ink-400" />
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-400">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Le vote est secret : aucun lien n’est conservé entre l’identité des votants et les
        bulletins. Le procès-verbal officiel est disponible auprès de l’administration du BDE.
      </p>
    </div>
  );
}
