import Link from "next/link";
import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import { getCurrentElection, getElectionDetail } from "@/server/services/elections";
import { getCurrentUser, isApprovedStudent } from "@/lib/auth/session";
import { ELECTION_STATUS_LABELS, isVoteWindowOpen } from "@/lib/election-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidats" };

export default async function CandidatesPage() {
  const [current, user] = await Promise.all([getCurrentElection(), getCurrentUser()]);
  const election = current ? await getElectionDetail(current.id) : null;
  const open = election ? isVoteWindowOpen(election) : false;

  if (!election || election.statut === "BROUILLON") {
    return (
      <div className="container-page py-14">
        <EmptyState
          title="Les candidats ne sont pas encore disponibles"
          description="L’administration du BDE prépare actuellement la liste des candidats. Reviens un peu plus tard."
          action={
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Retour à l’accueil
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="label-caps">Élection BDE</p>
          <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
            {election.titre}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-500">
            {election.description ||
              "Découvre les candidats, leur slogan et leur programme avant de voter."}
          </p>
        </div>
        <Badge variant={open ? "success" : "neutral"}>
          {open ? "Vote ouvert" : ELECTION_STATUS_LABELS[election.statut]}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
        {election.ouvreLe && election.fermeLe ? (
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden />
            Du {formatDateTime(election.ouvreLe)} au {formatDateTime(election.fermeLe)}
          </span>
        ) : null}
        <span>
          {election.positions.length > 0
            ? `${election.positions.length} poste(s) · ${election.candidates.length} candidat(s)`
            : `${election.candidates.length} candidat(s)`}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {election.candidates.map((candidate) => (
          <Card key={candidate.id} className="flex h-full flex-col overflow-hidden">
            <div className="relative h-44 bg-gradient-to-br from-brand-100 to-brand-50">
              {candidate.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={candidate.photoUrl}
                  alt={`Photo de ${candidate.nomAffiche}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-black text-brand-700 shadow-sm">
                    {initials(candidate.nomAffiche) || <UserRound className="h-8 w-8" />}
                  </span>
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink-700 shadow-sm">
                #{candidate.ordre}
              </span>
            </div>
            <CardContent className="flex flex-1 flex-col gap-3 p-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-ink-950">{candidate.nomAffiche}</h2>
                {candidate.positionId ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {election.positions.find((position) => position.id === candidate.positionId)
                      ?.titre ?? "Poste supprimé"}
                  </p>
                ) : null}
                {candidate.slogan ? (
                  <p className="text-sm italic text-brand-700">« {candidate.slogan} »</p>
                ) : null}
                {candidate.student ? (
                  <p className="text-xs text-ink-400">
                    {candidate.student.classe} · {candidate.student.matricule}
                  </p>
                ) : null}
              </div>

              {candidate.programme ? (
                <details className="group rounded-xl border border-ink-100 bg-ink-50/60 p-3 text-sm open:bg-white">
                  <summary className="cursor-pointer list-none font-semibold text-ink-800 marker:hidden">
                    Voir le programme
                  </summary>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-600">
                    {candidate.programme}
                  </p>
                </details>
              ) : (
                <p className="text-sm text-ink-400">Programme non renseigné.</p>
              )}

              <div className="mt-auto pt-2">
                {open ? (
                  <Link
                    href={isApprovedStudent(user) ? "/vote" : "/connexion"}
                    className={buttonVariants({ size: "sm", className: "w-full" })}
                  >
                    {isApprovedStudent(user)
                      ? election.positions.length > 0
                        ? "Ouvrir le bulletin"
                        : "Voter pour ce candidat"
                      : "Se connecter pour voter"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <p className="text-xs text-ink-400">
                    Le vote n’est pas ouvert. La liste reste consultable.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
