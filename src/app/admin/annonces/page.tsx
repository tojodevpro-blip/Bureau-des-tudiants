import Link from "next/link";
import type { AnnouncementStatus } from "@prisma/client";
import { BellRing, Eye, PlusCircle } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { parsePagination } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { listAnnouncementsForAdmin, publishDueAnnouncements } from "@/server/services/announcements";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Annonces" };
export const dynamic = "force-dynamic";

const statusLabels: Record<AnnouncementStatus, string> = {
  BROUILLON: "Brouillon",
  PUBLIEE: "Publiée",
  ARCHIVEE: "Archivée",
};

const statusVariants = {
  BROUILLON: "neutral",
  PUBLIEE: "success",
  ARCHIVEE: "warning",
} as const;

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; statut?: string }>;
}) {
  await requireStaffPage();
  await publishDueAnnouncements();
  const params = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(params.page) });
  const statut = ["BROUILLON", "PUBLIEE", "ARCHIVEE"].includes(params.statut ?? "")
    ? (params.statut as AnnouncementStatus)
    : undefined;
  const { items, total } = await listAnnouncementsForAdmin({
    page,
    pageSize,
    search: params.q?.trim() || undefined,
    statut,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Communication</p>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            <BellRing className="h-6 w-6 text-brand-700" aria-hidden />
            Annonces
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Rédige, programme, épingle et archive les annonces destinées aux étudiants.
          </p>
        </div>
        <Link href="/admin/annonces/nouvelle" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4" aria-hidden />
          Nouvelle annonce
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Rechercher un titre ou une catégorie…"
              aria-label="Rechercher une annonce"
              className="sm:max-w-sm"
            />
            <select
              name="statut"
              defaultValue={params.statut ?? ""}
              className="h-11 rounded-xl border border-ink-200 bg-white px-3 text-sm"
              aria-label="Filtrer par statut"
            >
              <option value="">Tous les statuts</option>
              <option value="BROUILLON">Brouillons</option>
              <option value="PUBLIEE">Publiées</option>
              <option value="ARCHIVEE">Archivées</option>
            </select>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Filtrer
            </button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-10 w-10" />}
          title="Aucune annonce"
          description="Crée une première annonce, puis publie-la immédiatement ou programme sa publication."
          action={
            <Link href="/admin/annonces/nouvelle" className={buttonVariants()}>
              <PlusCircle className="h-4 w-4" aria-hidden />
              Nouvelle annonce
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariants[announcement.statut]}>
                      {statusLabels[announcement.statut]}
                    </Badge>
                    <span className="text-xs font-medium text-ink-500">{announcement.categorie}</span>
                    {announcement.urgent ? <Badge variant="danger">Urgent</Badge> : null}
                    {announcement.epingle ? <Badge variant="info">Épinglée</Badge> : null}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-bold text-ink-950">{announcement.titre}</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {announcement.publieLe
                      ? `Publication : ${formatDateTime(announcement.publieLe)}`
                      : "Publication manuelle"}
                    {announcement.expireLe ? ` · Expire : ${formatDateTime(announcement.expireLe)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    {announcement.cibleToutes
                      ? "Toutes les classes"
                      : `Classes : ${announcement.classes.join(", ") || "aucune"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                    <Eye className="h-4 w-4" aria-hidden />
                    {announcement._count.reads} lecture(s)
                  </span>
                  <Link
                    href={`/admin/annonces/${announcement.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Modifier
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          <Pagination
            page={page}
            total={total}
            pageSize={pageSize}
            basePath="/admin/annonces"
            query={{ q: params.q, statut: params.statut }}
          />
        </div>
      )}
    </div>
  );
}
