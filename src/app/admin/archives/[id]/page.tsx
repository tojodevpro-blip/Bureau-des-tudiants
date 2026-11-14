import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Images } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { getAlbumForUser } from "@/server/services/archives";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaModeration } from "@/components/admin/media-moderation";
import { MediaUploader } from "@/components/admin/media-uploader";

export const dynamic = "force-dynamic";

export default async function AdminAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  await requireModule("archives");
  const { id } = await params;
  const album = await getAlbumForUser(id, true).catch(() => null);
  if (!album) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/archives" className="link-quiet inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux archives
        </Link>
        <a href={`/archives/${album.id}`} className="link-quiet inline-flex items-center gap-1 text-sm">
          Voir la page étudiante
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{album.annee}</Badge>
          <span className="text-sm text-ink-500">{album.media.length} photo(s)</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-950">{album.titre}</h1>
        {album.description ? <p className="mt-1 text-sm text-ink-500">{album.description}</p> : null}
      </div>

      <Card>
        <CardHeader><CardTitle>Ajouter des photos</CardTitle></CardHeader>
        <CardContent><MediaUploader albumId={album.id} /></CardContent>
      </Card>

      {album.media.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-6 text-center text-sm text-ink-500">
          <Images className="mx-auto mb-2 h-8 w-8 text-ink-400" aria-hidden />
          Aucune photo dans cet album.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {album.media.map((media) => (
            <Card key={media.id} className={media.masque ? "border-red-200" : undefined}>
              <a href={media.fullUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.thumbUrl ?? media.fullUrl} alt={media.nom} loading="lazy" className="aspect-[4/3] w-full rounded-t-2xl object-cover" />
              </a>
              <CardContent className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {media.masque ? <Badge variant="danger">Masquée</Badge> : <Badge variant="success">Visible</Badge>}
                  <span className="text-xs text-ink-400">{formatDateTime(media.createdAt)}</span>
                </div>
                <p className="truncate text-xs text-ink-500">{media.nom}</p>
                {media.masque && media.motifMasque ? <p className="text-xs text-red-700">Motif : {media.motifMasque}</p> : null}
                <MediaModeration mediaId={media.id} masque={media.masque} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
