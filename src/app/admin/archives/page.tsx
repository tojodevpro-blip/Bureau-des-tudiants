import Link from "next/link";
import { FileText, FolderPlus, Images } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDate } from "@/lib/utils";
import { listAlbums, listDocumentsForAdmin } from "@/server/services/archives";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Photos et documents" };
export const dynamic = "force-dynamic";

export default async function AdminArchivesPage() {
  await requireStaffPage();
  await requireModule("archives");
  const [albums, documents] = await Promise.all([listAlbums(), listDocumentsForAdmin()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Archives</p>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            <Images className="h-6 w-6 text-brand-700" aria-hidden />
            Photos et documents
          </h1>
          <p className="mt-1 text-sm text-ink-500">Gère les albums, modère les photos et publie les documents officiels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/archives/documents" className={buttonVariants({ variant: "outline" })}>
            <FileText className="h-4 w-4" aria-hidden />
            Documents
          </Link>
          <Link href="/admin/archives/nouveau" className={buttonVariants()}>
            <FolderPlus className="h-4 w-4" aria-hidden />
            Nouvel album
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-bold text-ink-950">Albums ({albums.length})</h2>
        {albums.length === 0 ? (
          <EmptyState className="mt-3" icon={<Images className="h-10 w-10" />} title="Aucun album" description="Crée un album puis ajoute des photos." action={<Link href="/admin/archives/nouveau" className={buttonVariants()}>Nouvel album</Link>} />
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <Card key={album.id} className="overflow-hidden">
                {album.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.coverUrl} alt="" className="h-36 w-full object-cover" />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-ink-100 text-ink-400"><Images className="h-8 w-8" aria-hidden /></div>
                )}
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{album.annee}</Badge>
                    <span className="text-xs text-ink-500">{album._count.media} photo(s)</span>
                  </div>
                  <h3 className="mt-2 truncate font-bold text-ink-950">{album.titre}</h3>
                  <Link href={`/admin/archives/${album.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}>Gérer</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-ink-950">Derniers documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <EmptyState className="mt-3" icon={<FileText className="h-10 w-10" />} title="Aucun document" description="Ajoute les documents officiels du BDE." action={<Link href="/admin/archives/documents" className={buttonVariants()}>Ajouter un document</Link>} />
        ) : (
          <div className="mt-3 space-y-2">
            {documents.slice(0, 5).map((document) => (
              <Card key={document.id}>
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{document.titre}</p>
                    <p className="text-xs text-ink-500">{document.categorie} · {formatDate(document.dateDocument)} · {Math.ceil(document.taille / 1024)} Ko</p>
                  </div>
                  <Link href="/admin/archives/documents" className={buttonVariants({ variant: "outline", size: "sm" })}>Gérer</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
