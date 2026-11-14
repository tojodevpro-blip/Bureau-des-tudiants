import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { listEvents } from "@/server/services/events";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";

export const metadata = { title: "Programme" };
export const dynamic = "force-dynamic";

export default async function ProgrammePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  await requireModule("programme");
  const user = await getCurrentUser();
  const params = await searchParams;
  const { items, categories } = await listEvents({
    includePast: true,
    categorie: params.categorie?.trim() || undefined,
  });
  const now = new Date();
  const upcoming = items.filter((event) => event.fin >= now);
  const past = items.filter((event) => event.fin < now).reverse();

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <p className="label-caps">Agenda</p>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          <CalendarDays className="h-7 w-7 text-brand-700" aria-hidden />
          Programme du BDE
        </h1>
        <p className="text-sm text-ink-500">
          Événements à venir, inscriptions, liste d’attente et billets avec QR de présence.
        </p>
      </div>

      <form className="mt-5 flex gap-2">
        <Select name="categorie" defaultValue={params.categorie ?? ""} aria-label="Filtrer par catégorie" className="max-w-xs">
          <option value="">Toutes les catégories</option>
          {categories.map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}
        </Select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrer</button>
      </form>

      <section className="mt-8" aria-labelledby="upcoming-title">
        <h2 id="upcoming-title" className="text-xl font-bold text-ink-950">À venir</h2>
        {upcoming.length === 0 ? (
          <EmptyState className="mt-4" icon={<CalendarDays className="h-10 w-10" />} title="Aucun événement à venir" description="Le programme sera publié prochainement." />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {upcoming.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                {event.visuelUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.visuelUrl} alt="" className="h-40 w-full object-cover" />
                ) : null}
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{event.categorie}</Badge>
                    {event.annuleLe ? <Badge variant="danger">Annulé</Badge> : null}
                    {event.capacite ? <Badge variant="info">{event._count.rsvps}/{event.capacite} inscrits</Badge> : null}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-ink-950">
                    <Link href={`/programme/${event.id}`} className="hover:text-brand-700">{event.titre}</Link>
                  </h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
                    <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                    {formatDateTime(event.debut)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    {event.lieu}
                  </p>
                  {event.capacite ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                      <Users className="h-4 w-4 shrink-0" aria-hidden />
                      {event.capacite - event._count.rsvps > 0
                        ? `${event.capacite - event._count.rsvps} place(s) restante(s)`
                        : "Complet · liste d’attente"}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/programme/${event.id}`} className={buttonVariants({ size: "sm" })}>
                      Détails et inscription
                    </Link>
                    <a href={`/api/events/${event.id}/ics`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Ajouter au calendrier
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mt-10" aria-labelledby="past-title">
          <h2 id="past-title" className="text-xl font-bold text-ink-950">Événements passés</h2>
          <div className="mt-4 space-y-2">
            {past.map((event) => (
              <Link key={event.id} href={`/programme/${event.id}`} className="surface flex items-center justify-between gap-3 p-4 hover:border-brand-200">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{event.titre}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(event.debut)} · {event.lieu}</p>
                </div>
                <Badge variant="neutral">{event.categorie}</Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!user ? (
        <p className="mt-8 rounded-xl border border-ink-200 bg-white p-4 text-sm text-ink-500">
          <Link href="/connexion" className="font-semibold text-brand-700 underline underline-offset-2">Connecte-toi</Link> pour t’inscrire et recevoir ton billet QR.
        </p>
      ) : null}
    </div>
  );
}
