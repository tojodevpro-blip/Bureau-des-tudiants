import Link from "next/link";
import { BarChart3, PlusCircle, Users } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { parsePagination } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { listPollsForAdmin } from "@/server/services/polls";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Sondages" };
export const dynamic = "force-dynamic";

export default async function AdminPollsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireStaffPage();
  await requireModule("sondages");
  const params = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(params.page) });
  const { items, total } = await listPollsForAdmin({ page, pageSize });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Participation</p>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            <BarChart3 className="h-6 w-6 text-brand-700" aria-hidden />
            Sondages
          </h1>
          <p className="mt-1 text-sm text-ink-500">Sondages d’opinion rapides, distincts de l’élection officielle.</p>
        </div>
        <Link href="/admin/sondages/nouveau" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4" aria-hidden />
          Nouveau sondage
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<BarChart3 className="h-10 w-10" />} title="Aucun sondage" description="Crée un sondage, puis ouvre-le pour notifier les étudiants." action={<Link href="/admin/sondages/nouveau" className={buttonVariants()}>Nouveau sondage</Link>} />
      ) : (
        <div className="space-y-3">
          {items.map((poll) => (
            <Card key={poll.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={poll.statut === "OUVERT" ? "success" : poll.statut === "BROUILLON" ? "neutral" : "warning"}>
                      {poll.statut === "OUVERT" ? "Ouvert" : poll.statut === "BROUILLON" ? "Brouillon" : "Clôturé"}
                    </Badge>
                    {poll.multiple ? <Badge variant="neutral">Choix multiples</Badge> : null}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-bold text-ink-950">{poll.question}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{poll._count.participations} participant(s)</span>
                    <span>{poll.options.length} option(s)</span>
                    {poll.closesAt ? <span>Clôture {formatDateTime(poll.closesAt)}</span> : null}
                  </p>
                </div>
                <Link href={`/admin/sondages/${poll.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Ouvrir</Link>
              </CardContent>
            </Card>
          ))}
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/admin/sondages" />
        </div>
      )}
    </div>
  );
}
