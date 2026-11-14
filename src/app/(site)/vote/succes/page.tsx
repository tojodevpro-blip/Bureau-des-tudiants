import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { getCurrentElection } from "@/server/services/elections";
import { getUserVoteStatus } from "@/server/services/voting";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Vote enregistré" };
export const dynamic = "force-dynamic";

export default async function VoteSuccessPage() {
  const user = await requireStudentPage();
  const election = await getCurrentElection();
  if (!election) redirect("/tableau-de-bord");
  const vote = await getUserVoteStatus(election.id, user.id);
  if (!vote) redirect("/vote");

  return (
    <div className="container-page py-14">
      <Card className="mx-auto max-w-xl overflow-hidden">
        <div className="bg-brand-700 px-6 py-8 text-center text-white">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black">Vote enregistré</h1>
          <p className="mt-1 text-sm text-brand-100">
            Merci d’avoir participé à l’élection du BDE.
          </p>
        </div>
        <CardContent className="space-y-4 p-6">
          <div className="rounded-xl bg-ink-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Date d’enregistrement
            </p>
            <p className="mt-1 text-lg font-bold text-ink-950">
              {formatDateTime(vote.createdAt)}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Ton choix n’est pas affiché ici et ne peut plus être modifié. Aucun lien entre
              ton nom et ton bulletin n’est conservé.
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/tableau-de-bord" className={buttonVariants()}>
              Mon espace
            </Link>
            <Link href="/resultats" className={buttonVariants({ variant: "outline" })}>
              Résultats
            </Link>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Les résultats seront publiés après la clôture du scrutin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
