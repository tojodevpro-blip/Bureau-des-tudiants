import Link from "next/link";
import { CalendarDays, MapPin, PlusCircle, Users } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { parsePagination } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { listEventsForAdmin } from "@/server/services/events";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Programme" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireStaffPage();
  await requireModule("programme");
  const params = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(params.page) });
  const { items, total } = await listEventsForAdmin({
    page,
    pageSize,
    search: params.q?.trim() || undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Agenda</p>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            <CalendarDays className="h-6 w-6 text-brand-700" aria-hidden />
            Programme
          </h1>
          <p className="mt-1 text-sm text-ink-500">Crée les événements, gère les inscriptions et valide les présences.</p>
        </div>
        <Link href="/admin/programme/nouveau" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4" aria-hidden />
          Nouvel événement
        </Link>
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={params.q ?? ""} placeholder="Rechercher un événement…" aria-label="Rechercher un événement" className="max-w-sm" />
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Rechercher</button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-10 w-10" />} title="Aucun événement" description="Crée le premier événement du programme." action={<Link href="/admin/programme/nouveau" className={buttonVariants()}>Nouvel événement</Link>} />
      ) : (
        <div className="space-y-3">
          {items.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{event.categorie}</Badge>
                    {event.annuleLe ? <Badge variant="danger">Annulé</Badge> : event.fin < new Date() ? <Badge variant="warning">Terminé</Badge> : <Badge variant="success">À venir</Badge>}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-bold text-ink-950">{event.titre}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden />{formatDateTime(event.debut)}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{event.lieu}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{event._count.rsvps} inscrit(s){event.capacite ? ` / ${event.capacite}` : ""}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/programme/${event.id}/presences`} className={buttonVariants({ variant: "outline", size: "sm" })}>Présences</Link>
                  <Link href={`/admin/programme/${event.id}`} className={buttonVariants({ size: "sm" })}>Modifier</Link>
                </div>
              </CardContent>
            </Card>
          ))}
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/admin/programme" query={{ q: params.q }} />
        </div>
      )}
    </div>
  );
}
