import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, FileText, UserRound, XCircle } from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { getCandidaturePageData } from "@/server/services/candidatures";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { CandidatureForm } from "@/components/site/candidature-form";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Candidature" };
export const dynamic = "force-dynamic";

const statusMeta = {
  EN_ATTENTE: {
    label: "En attente de validation",
    variant: "warning" as const,
    icon: Clock3,
  },
  VALIDEE: {
    label: "Candidature validée",
    variant: "success" as const,
    icon: CheckCircle2,
  },
  REFUSEE: {
    label: "Candidature refusée",
    variant: "danger" as const,
    icon: XCircle,
  },
};

export default async function CandidaturePage() {
  const user = await requireStudentPage();
  await requireModule("candidatures");
  const data = await getCandidaturePageData(user.id);

  if (!data.election) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon={<UserRound className="h-10 w-10" />}
          title="Aucune candidature ouverte"
          description="L’administration du BDE n’a pas encore ouvert la période de candidatures. Reviens un peu plus tard."
          action={
            <Link href="/tableau-de-bord" className={buttonVariants({ variant: "outline" })}>
              Retour à mon espace
            </Link>
          }
        />
      </div>
    );
  }

  const election = data.election;
  const application = data.application;
  const canApply = data.canApply;
  const closed = data.closed;
  const meta = application ? statusMeta[application.statut] : null;
  const Icon = meta?.icon;

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <div className="space-y-2">
        <p className="label-caps">Élection BDE</p>
        <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          {election.titre}
        </h1>
        <p className="text-sm leading-relaxed text-ink-500">
          Dépose ta candidature au poste de ton choix. Le bureau du BDE examinera chaque
          candidature avant publication.
        </p>
      </div>

      {user.statut === "EN_ATTENTE" ? (
        <Alert variant="warning" title="Compte en attente" className="mt-6">
          Ton compte doit être approuvé par l’administration avant de pouvoir candidater.
        </Alert>
      ) : null}

      {application ? (
        <Card className="mt-6">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Ma candidature
                </p>
                <h2 className="mt-1 text-xl font-bold text-ink-950">
                  {application.position.titre}
                </h2>
                <p className="mt-1 text-xs text-ink-500">
                  Déposée le {formatDateTime(application.createdAt)}
                </p>
              </div>
              {meta && Icon ? (
                <Badge variant={meta.variant} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {meta.label}
                </Badge>
              ) : null}
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Mon programme
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {application.programme}
              </p>
            </div>

            {application.motif ? (
              <Alert variant={application.statut === "REFUSEE" ? "error" : "info"}>
                <span className="font-semibold">Motif communiqué par le BDE :</span>{" "}
                {application.motif}
              </Alert>
            ) : null}

            {application.statut === "EN_ATTENTE" ? (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Ta candidature est en cours d’examen. Tu recevras une notification dès
                qu’elle aura été traitée.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : election.positions.length === 0 ? (
        <Alert variant="info" title="Postes non configurés" className="mt-6">
          Les postes de cette élection ne sont pas encore configurés. Contacte le bureau du
          BDE.
        </Alert>
      ) : canApply ? (
        <Card className="mt-6">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink-950">Déposer ma candidature</h2>
            <p className="mt-1 text-sm text-ink-500">
              Une seule candidature par élection. Vérifie bien le poste choisi avant l’envoi.
            </p>
            <div className="mt-5">
              <CandidatureForm
                electionTitle={election.titre}
                positions={election.positions.map((position) => ({
                  id: position.id,
                  titre: position.titre,
                  description: position.description,
                }))}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="info" title="Candidatures closes" className="mt-6">
          {closed
            ? "La période de dépôt des candidatures est terminée pour cette élection."
            : "Tu ne peux pas déposer de candidature actuellement."}
        </Alert>
      )}
    </div>
  );
}
