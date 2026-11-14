import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, LockKeyhole, ShieldCheck, Vote } from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { getCurrentElection, getElectionDetail } from "@/server/services/elections";
import { getUserVoteStatus } from "@/server/services/voting";
import { isVoteWindowOpen } from "@/lib/election-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { VoteClient } from "@/components/vote/vote-client";
import { MultiVoteClient } from "@/components/vote/multi-vote-client";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Voter" };
export const dynamic = "force-dynamic";

export default async function VotePage() {
  const user = await requireStudentPage();
  const current = await getCurrentElection();

  if (user.statut === "EN_ATTENTE") {
    return (
      <div className="container-page py-14">
        <Alert variant="warning" title="Compte en attente">
          Ton compte doit être approuvé par l’administration du BDE avant de pouvoir voter.
          Tu peux vérifier ton statut dans ton espace personnel.
        </Alert>
        <Link href="/tableau-de-bord" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Retour à mon espace
        </Link>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="container-page py-14">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
              <Clock3 className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="text-2xl font-bold text-ink-950">Aucun scrutin en cours</h1>
            <p className="text-sm text-ink-500">
              L’administration du BDE n’a pas encore ouvert de vote. Reviens plus tard.
            </p>
            <Link href="/tableau-de-bord" className={buttonVariants({ variant: "outline" })}>
              Retour à mon espace
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadyVoted = await getUserVoteStatus(current.id, user.id);
  const election = await getElectionDetail(current.id);
  if (!election) {
    return null;
  }

  if (alreadyVoted) {
    return (
      <div className="container-page py-14">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="text-2xl font-bold text-ink-950">Vote déjà enregistré</h1>
            <p className="text-sm text-ink-500">
              Ton vote a été enregistré le {formatDateTime(alreadyVoted.createdAt)}. Un seul
              vote est autorisé et il ne peut plus être modifié.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/tableau-de-bord" className={buttonVariants()}>
                Mon espace
              </Link>
              <Link href="/resultats" className={buttonVariants({ variant: "outline" })}>
                Résultats
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const open = isVoteWindowOpen(election);

  if (!open) {
    return (
      <div className="container-page py-14">
        <Card className="mx-auto max-w-xl">
          <CardContent className="space-y-4 p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
              <LockKeyhole className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="text-2xl font-bold text-ink-950">Le vote n’est pas ouvert</h1>
            <p className="text-sm text-ink-500">
              {election.statut === "OUVERTE"
                ? "Le scrutin est ouvert uniquement pendant la fenêtre définie par le BDE."
                : "Cette élection n’est pas encore ouverte, ou elle est terminée."}
            </p>
            {election.ouvreLe && election.fermeLe ? (
              <p className="text-sm font-medium text-ink-700">
                Du {formatDateTime(election.ouvreLe)} au {formatDateTime(election.fermeLe)}
              </p>
            ) : null}
            <Link href="/tableau-de-bord" className={buttonVariants({ variant: "outline" })}>
              Retour à mon espace
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const candidates = election.candidates.map((candidate) => ({
    id: candidate.id,
    positionId: candidate.positionId,
    nomAffiche: candidate.nomAffiche,
    photoUrl: candidate.photoUrl,
    slogan: candidate.slogan,
    programme: candidate.programme,
    ordre: candidate.ordre,
  }));
  const positions = election.positions.map((position) => ({
    id: position.id,
    titre: position.titre,
    description: position.description,
    candidates: candidates.filter((candidate) => candidate.positionId === position.id),
  }));
  const multiPost = positions.length > 0;

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Badge variant="success">Vote ouvert</Badge>
            <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
              {election.titre}
            </h1>
            <p className="text-sm text-ink-500">
              {multiPost
                ? "Choisis un candidat ou un vote blanc pour chaque poste, puis confirme ton bulletin."
                : "Sélectionne un seul candidat ou vote blanc, puis confirme."}
            </p>
          </div>
          {election.fermeLe ? (
            <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-ink-500 shadow-card">
              <Clock3 className="h-4 w-4" aria-hidden />
              Ferme le {formatDateTime(election.fermeLe)}
            </div>
          ) : null}
        </div>

        <Alert variant="info" title="Un seul vote, définitif" className="mt-5">
          Tu ne pourras plus modifier ton choix après confirmation. Ton vote est secret : il
          n’est jamais relié à ton identité.
        </Alert>

        {multiPost ? (
          <MultiVoteClient electionId={election.id} positions={positions} />
        ) : (
          <VoteClient electionId={election.id} candidates={candidates} />
        )}

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Le serveur vérifie ton compte, la fenêtre de vote et l’unicité de ton vote à chaque
          requête. Toute tentative de double vote est rejetée.
        </p>
      </div>
    </div>
  );
}
