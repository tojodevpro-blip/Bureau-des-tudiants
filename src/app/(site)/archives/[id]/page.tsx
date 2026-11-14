import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Images } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { getAlbumForUser } from "@/server/services/archives";
import { Badge } from "@/components/ui/badge";
import { ReportButton } from "@/components/site/report-button";
import { PhotoTagButton } from "@/components/site/photo-tag-button";

export const dynamic = "force-dynamic";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  await requireModule("archives");
  const { id } = await params;
  const album = await getAlbumForUser(id).catch(() => null);
  if (!album) notFound();

  return (
    <div className="container-page py-10 sm:py-14">
      <Link href="/archives" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux archives
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{album.annee}</Badge>
        <span className="text-sm text-ink-500">{album.media.length} photo(s)</span>
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-950">{album.titre}</h1>
      {album.description ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{album.description}</p> : null}

      {album.media.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 p-12 text-center text-ink-500">
          <Images className="h-10 w-10 text-ink-400" aria-hidden />
          <p className="font-semibold text-ink-800">Album vide</p>
          <p className="text-sm">Les photos seront ajoutées prochainement.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {album.media.map((media) => (
            <figure key={media.id} className="surface overflow-hidden">
              <a href={media.fullUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.thumbUrl ?? media.fullUrl} alt={media.nom} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              </a>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <a href={media.downloadUrl} className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-700">
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Télécharger
                  </a>
                  {user.role === "STUDENT" ? <PhotoTagButton mediaId={media.id} /> : null}
                </div>
                <ReportButton targetType="PHOTO" targetId={media.id} />
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
