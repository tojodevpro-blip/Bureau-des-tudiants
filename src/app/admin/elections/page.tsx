import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy, Vote } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { listElections } from "@/server/services/elections";
import { ELECTION_STATUS_LABELS } from "@/lib/election-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateElectionDialog } from "@/components/admin/create-election-dialog";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Élections" };
export const dynamic = "force-dynamic";

const statusVariant = {
  BROUILLON: "neutral",
  CANDIDATURES: "info",
  OUVERTE: "success",
  CLOTUREE: "warning",
  PUBLIEE: "brand",
} as const;

export default async function ElectionsPage() {
  await requireAdminPage();
  const elections = await listElections();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Scrutin</p>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            <Vote className="h-6 w-6 text-brand-700" aria-hidden />
            Élections
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Crée le scrutin, ajoute les candidats, ouvre et clôture le vote, publie les
            résultats.
          </p>
        </div>
        <CreateElectionDialog />
      </div>

      {elections.length === 0 ? (
        <EmptyState
          icon={<Vote className="h-10 w-10" />}
          title="Aucune élection"
          description="Crée une élection, ajoute au moins deux candidats, puis ouvre le vote."
          action={<CreateElectionDialog />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {elections.map((election) => (
            <Card key={election.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant[election.statut]}>
                        {ELECTION_STATUS_LABELS[election.statut]}
                      </Badge>
                      {election.statut === "PUBLIEE" ? (
                        <Trophy className="h-4 w-4 text-accent-600" aria-hidden />
                      ) : null}
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-ink-950">{election.titre}</h2>
                    {election.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                        {election.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-ink-50 p-2">
                    <p className="text-lg font-bold text-ink-950">{election._count.candidates}</p>
                    <p className="text-[11px] text-ink-500">candidats</p>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-2">
                    <p className="text-lg font-bold text-ink-950">
                      {election._count.participations}
                    </p>
                    <p className="text-[11px] text-ink-500">votants</p>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-2">
                    <p className="text-lg font-bold text-ink-950">
                      {election.ouvreLe ? formatDateTime(election.ouvreLe, { day: "2-digit", month: "2-digit" }) : "—"}
                    </p>
                    <p className="text-[11px] text-ink-500">ouverture</p>
                  </div>
                </div>

                {election.ouvreLe && election.fermeLe ? (
                  <p className="flex items-center gap-2 text-xs text-ink-500">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Du {formatDateTime(election.ouvreLe)} au {formatDateTime(election.fermeLe)}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-amber-700">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    Fenêtre de vote à définir
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/admin/elections/${election.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Gérer
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  {election.statut === "PUBLIEE" ? (
                    <Link
                      href="/resultats"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Voir les résultats publics
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
