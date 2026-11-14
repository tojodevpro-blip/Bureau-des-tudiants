import Link from "next/link";
import { Archive, Download, FileText, Images } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDate } from "@/lib/utils";
import { listAlbums, listDocuments } from "@/server/services/archives";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";

export const metadata = { title: "Photos et documents" };
export const dynamic = "force-dynamic";

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; categorie?: string }>;
}) {
  await requireUserPage();
  await requireModule("archives");
  const params = await searchParams;
  const [albums, documents] = await Promise.all([
    listAlbums({ annee: params.annee ? Number(params.annee) : undefined }),
    listDocuments({ categorie: params.categorie?.trim() || undefined }),
  ]);
  const years = [...new Set(albums.map((album) => album.annee))];

  return (
    <div className="container-page py-10 sm:py-14">
      <p className="label-caps">Mémoire du BDE</p>
      <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
        <Archive className="h-7 w-7 text-brand-700" aria-hidden />
        Photos et documents
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Les souvenirs des événements et les documents utiles, classés par année.
      </p>

      <form className="mt-5 flex gap-2">
        <Select name="annee" defaultValue={params.annee ?? ""} aria-label="Filtrer par année" className="max-w-[180px]">
          <option value="">Toutes les années</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </Select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrer</button>
      </form>

      <section className="mt-8" aria-labelledby="albums-title">
        <h2 id="albums-title" className="flex items-center gap-2 text-xl font-bold text-ink-950">
          <Images className="h-5 w-5 text-brand-700" aria-hidden />
          Albums photos
        </h2>
        {albums.length === 0 ? (
          <EmptyState className="mt-4" icon={<Images className="h-10 w-10" />} title="Aucun album" description="Les photos des événements apparaîtront ici." />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <Link key={album.id} href={`/archives/${album.id}`} className="surface group overflow-hidden transition hover:border-brand-200">
                {album.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={album.coverUrl} alt="" className="h-44 w-full object-cover transition group-hover:scale-[1.02]" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-ink-100 text-ink-400"><Images className="h-10 w-10" aria-hidden /></div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral">{album.annee}</Badge>
                    <span className="text-xs text-ink-500">{album._count.media} photo(s)</span>
                  </div>
                  <h3 className="mt-2 font-bold text-ink-950">{album.titre}</h3>
                  {album.description ? <p className="mt-1 line-clamp-2 text-sm text-ink-500">{album.description}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="documents-title">
        <h2 id="documents-title" className="flex items-center gap-2 text-xl font-bold text-ink-950">
          <FileText className="h-5 w-5 text-brand-700" aria-hidden />
          Documents
        </h2>
        {documents.length === 0 ? (
          <EmptyState className="mt-4" icon={<FileText className="h-10 w-10" />} title="Aucun document" description="Les documents officiels seront publiés ici." />
        ) : (
          <div className="mt-4 space-y-2">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{document.categorie}</Badge>
                      <span className="text-xs text-ink-400">{formatDate(document.dateDocument)}</span>
                    </div>
                    <p className="mt-1 truncate font-semibold text-ink-900">{document.titre}</p>
                    {document.description ? <p className="text-sm text-ink-500">{document.description}</p> : null}
                  </div>
                  <a href={document.downloadUrl} className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}>
                    <Download className="h-4 w-4" aria-hidden />
                    Télécharger
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
