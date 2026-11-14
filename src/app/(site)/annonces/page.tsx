import Link from "next/link";
import { BellRing, Pin, Search } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { parsePagination } from "@/lib/pagination";
import { stripHtml } from "@/lib/sanitize";
import { formatDateTime, truncate } from "@/lib/utils";
import { listAnnouncementsForStudent } from "@/server/services/announcements";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Annonces" };
export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; categorie?: string; nonLus?: string }>;
}) {
  const user = await requireUserPage();
  await requireModule("annonces");
  const params = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(params.page) }, 12);
  const staff = user.role !== "STUDENT";
  const { items, total, categories } = await listAnnouncementsForStudent(
    user.id,
    user.student?.classe ?? null,
    {
      page,
      pageSize,
      search: params.q?.trim() || undefined,
      categorie: params.categorie?.trim() || undefined,
      unread: params.nonLus === "1",
      allAudiences: staff,
    },
  );

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <p className="label-caps">Communication</p>
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          <BellRing className="h-7 w-7 text-brand-700" aria-hidden />
          Annonces
        </h1>
        <p className="text-sm text-ink-500">
          Toute la vie du BDE : informations, urgences, événements et annonces de ta classe.
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Rechercher une annonce…"
                aria-label="Rechercher une annonce"
                className="pl-9"
              />
            </div>
            <Select name="categorie" defaultValue={params.categorie ?? ""} aria-label="Catégorie" className="sm:max-w-[200px]">
              <option value="">Toutes les catégories</option>
              {categories.map((categorie) => (
                <option key={categorie} value={categorie}>{categorie}</option>
              ))}
            </Select>
            <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm font-medium text-ink-700">
              <input type="checkbox" name="nonLus" value="1" defaultChecked={params.nonLus === "1"} className="h-4 w-4 rounded border-ink-300" />
              Non lues
            </label>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Filtrer
            </button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<BellRing className="h-10 w-10" />}
          title={params.nonLus === "1" ? "Tout est à jour" : "Aucune annonce"}
          description={
            params.nonLus === "1"
              ? "Tu as lu toutes les annonces qui te concernent."
              : "Aucune annonce ne correspond à ces filtres pour le moment."
          }
          action={
            params.q || params.categorie || params.nonLus ? (
              <Link href="/annonces" className={buttonVariants({ variant: "outline" })}>
                Réinitialiser les filtres
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((announcement) => {
            const unread = announcement.reads.length === 0;
            return (
              <Card key={announcement.id} className={announcement.epingle ? "border-brand-200" : undefined}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {announcement.epingle ? (
                      <Badge variant="info"><Pin className="h-3 w-3" aria-hidden /> Épinglée</Badge>
                    ) : null}
                    {announcement.urgent ? <Badge variant="danger">Urgent</Badge> : null}
                    <Badge variant="neutral">{announcement.categorie}</Badge>
                    {unread ? <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Non lue" /> : null}
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-ink-950">
                    <Link href={`/annonces/${announcement.id}`} className="hover:text-brand-700">
                      {announcement.titre}
                    </Link>
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-600">
                    {truncate(stripHtml(announcement.contenu), 220)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <time className="text-xs text-ink-400" dateTime={announcement.publieLe?.toISOString()}>
                      {announcement.publieLe ? formatDateTime(announcement.publieLe) : "Publiée"}
                    </time>
                    <Link href={`/annonces/${announcement.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Lire l’annonce
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            basePath="/annonces"
            query={{ q: params.q, categorie: params.categorie, nonLus: params.nonLus }}
          />
        </div>
      )}
    </div>
  );
}
