import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Users,
  Vote,
} from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import {
  getElectionDetail,
  getCurrentElection,
} from "@/server/services/elections";
import { getParticipation } from "@/server/services/voting";
import { getElectionResults } from "@/server/services/results";
import { ELECTION_STATUS_LABELS } from "@/lib/election-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/empty-state";
import { ElectionStatusActions } from "@/components/admin/election-status-actions";
import { ElectionEditForm } from "@/components/admin/election-edit-form";
import { CandidateManager } from "@/components/admin/candidate-manager";
import { PositionManager } from "@/components/admin/position-manager";
import { CandidatureReview } from "@/components/admin/candidature-review";
import { formatDateTime, formatPercent } from "@/lib/utils";

export const metadata = { title: "Gestion de l’élection" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const statusVariant = {
  BROUILLON: "neutral",
  CANDIDATURES: "info",
  OUVERTE: "success",
  CLOTUREE: "warning",
  PUBLIEE: "brand",
} as const;

export default async function ElectionDetailPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  const election = await getElectionDetail(id);
  if (!election) notFound();

  const participation = await getParticipation(election.id);
  const closed = ["CLOTUREE", "PUBLIEE"].includes(election.statut);
  const results = closed ? await getElectionResults(election.id) : null;
  const editable = ["BROUILLON", "CANDIDATURES"].includes(election.statut);
  const publicElection = await getCurrentElection();
  const isPublic = publicElection?.id === election.id && election.statut !== "BROUILLON";

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/elections" className="link-quiet inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux élections
        </Link>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[election.statut]}>
                {ELECTION_STATUS_LABELS[election.statut]}
              </Badge>
              <span className="text-xs text-ink-400">ID {election.id.slice(0, 8)}</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              {election.titre}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden />
                {election.ouvreLe ? formatDateTime(election.ouvreLe) : "Ouverture à définir"} →{" "}
                {election.fermeLe ? formatDateTime(election.fermeLe) : "fermeture à définir"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden />
                {election.positions.length} poste(s) · {election.candidates.length}{" "}
                candidat(s)
              </span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <ElectionStatusActions electionId={election.id} statut={election.statut} />
            {isPublic ? (
              <Link
                href={election.statut === "PUBLIEE" ? "/resultats" : "/candidats"}
                className="link-quiet inline-flex items-center gap-1"
              >
                Voir la page publique
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <ElectionEditForm
                election={{
                  id: election.id,
                  titre: election.titre,
                  description: election.description,
                  ouvreLe: election.ouvreLe ? election.ouvreLe.toISOString() : null,
                  fermeLe: election.fermeLe ? election.fermeLe.toISOString() : null,
                  statut: election.statut,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Postes</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionManager
                electionId={election.id}
                editable={editable}
                positions={election.positions.map((position) => ({
                  id: position.id,
                  titre: position.titre,
                  description: position.description,
                  ordre: position.ordre,
                  candidateCount: election.candidates.filter(
                    (candidate) => candidate.positionId === position.id,
                  ).length,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidats</CardTitle>
            </CardHeader>
            <CardContent>
              <CandidateManager
                electionId={election.id}
                editable={editable}
                positions={election.positions.map((position) => ({
                  id: position.id,
                  titre: position.titre,
                }))}
                candidates={election.candidates.map((candidate) => ({
                  id: candidate.id,
                  positionId: candidate.positionId,
                  nomAffiche: candidate.nomAffiche,
                  photoUrl: candidate.photoUrl,
                  slogan: candidate.slogan,
                  programme: candidate.programme,
                  ordre: candidate.ordre,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidatures</CardTitle>
            </CardHeader>
            <CardContent>
              <CandidatureReview
                applications={election.applications.map((application) => ({
                  id: application.id,
                  statut: application.statut,
                  photoUrl: application.photoUrl,
                  slogan: application.slogan,
                  programme: application.programme,
                  motif: application.motif,
                  createdAt: application.createdAt.toISOString(),
                  position: application.position,
                  student: application.student,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-700" aria-hidden />
                Participation en direct
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-500">Votants</p>
                  <p className="text-xl font-bold text-ink-950">{participation.votants}</p>
                </div>
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-500">Inscrits</p>
                  <p className="text-xl font-bold text-ink-950">{participation.inscrits}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Taux</span>
                  <span className="font-bold text-ink-950">
                    {formatPercent(participation.taux)}
                  </span>
                </div>
                <ProgressBar value={participation.taux} />
              </div>
              <p className="text-xs text-ink-400">
                {participation.totalEtudiants} étudiants actifs dans la liste. Seuls les
                comptes approuvés sont comptés comme inscrits.
              </p>
              {!closed ? (
                <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                  Les résultats par candidat sont masqués tant que l’élection n’est pas
                  clôturée.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {closed && results ? (
            <Card>
              <CardHeader>
                <CardTitle>Résultats du scrutin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.positions.length > 0 ? (
                  <div className="space-y-5">
                    {results.positions.map((positionResult) => (
                      <div key={positionResult.position.id} className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                          {positionResult.position.titre}
                        </p>
                        {positionResult.classement.map((entry, index) => (
                          <div key={entry.candidate.id} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="truncate font-medium text-ink-800">
                                {index + 1}. {entry.candidate.nomAffiche}
                              </span>
                              <span className="shrink-0 text-ink-500">
                                {entry.votes} · {formatPercent(entry.pourcentage)}
                              </span>
                            </div>
                            <ProgressBar value={entry.pourcentage} />
                          </div>
                        ))}
                        <div className="border-t border-ink-100 pt-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-ink-700">Vote blanc</span>
                            <span className="text-ink-500">
                              {positionResult.blancs} ·{" "}
                              {formatPercent(positionResult.blancsPourcentage)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.classement.map((entry, index) => (
                      <div key={entry.candidate.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-ink-800">
                            {index + 1}. {entry.candidate.nomAffiche}
                          </span>
                          <span className="shrink-0 text-ink-500">
                            {entry.votes} · {formatPercent(entry.pourcentage)}
                          </span>
                        </div>
                        <ProgressBar value={entry.pourcentage} />
                      </div>
                    ))}
                    <div className="border-t border-ink-100 pt-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-700">Vote blanc</span>
                        <span className="text-ink-500">
                          {results.blancs} · {formatPercent(results.blancsPourcentage)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href={`/api/admin/elections/${election.id}/export/pdf`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Procès-verbal PDF
                  </a>
                  <a
                    href={`/api/admin/elections/${election.id}/export/csv`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <FileText className="h-4 w-4" aria-hidden />
                    Export CSV
                  </a>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Exports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-ink-500">
                <p>Le procès-verbal PDF et le CSV seront disponibles après la clôture.</p>
                <div className="flex flex-col gap-2 opacity-50">
                  <span className={buttonVariants({ size: "sm" })}>
                    <Download className="h-4 w-4" aria-hidden />
                    Procès-verbal PDF
                  </span>
                  <span className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <FileText className="h-4 w-4" aria-hidden />
                    Export CSV
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="space-y-2 p-5 text-xs leading-relaxed text-ink-500">
              <p className="flex items-center gap-1.5 font-semibold text-ink-700">
                <Vote className="h-4 w-4" aria-hidden />
                Rappel sécurité
              </p>
              <p>
                Le vote est accepté uniquement si l’élection est ouverte, dans la fenêtre
                horaire, et si le compte étudiant est approuvé. L’unicité est garantie par une
                contrainte de base de données.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
