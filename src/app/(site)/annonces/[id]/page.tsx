import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guard";
import { isApprovedStudent } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { getAnnouncementForStudent, markAnnouncementRead } from "@/server/services/announcements";
import { listComments } from "@/server/services/comments";
import { Badge } from "@/components/ui/badge";
import { Comments } from "@/components/site/comments";
import { ReportButton } from "@/components/site/report-button";

export const dynamic = "force-dynamic";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  await requireModule("annonces");
  const { id } = await params;
  const staff = user.role !== "STUDENT";
  const announcement = await getAnnouncementForStudent(
    id,
    user.id,
    user.student?.classe ?? null,
    staff,
  ).catch(() => null);
  if (!announcement) notFound();

  await markAnnouncementRead(id, user.id);
  const comments = await listComments("ANNONCE", id);

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Link href="/annonces" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux annonces
      </Link>

      <article className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.epingle ? (
            <Badge variant="info"><Pin className="h-3 w-3" aria-hidden /> Épinglée</Badge>
          ) : null}
          {announcement.urgent ? <Badge variant="danger">Urgent</Badge> : null}
          <Badge variant="neutral">{announcement.categorie}</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          {announcement.titre}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Publiée le {announcement.publieLe ? formatDateTime(announcement.publieLe) : "—"}
          {announcement.expireLe ? ` · Visible jusqu’au ${formatDateTime(announcement.expireLe)}` : ""}
        </p>

        {announcement.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={announcement.imageUrl}
            alt=""
            className="mt-5 max-h-[28rem] w-full rounded-2xl border border-ink-100 object-cover"
          />
        ) : null}

        <div
          className="rich-content mt-6"
          dangerouslySetInnerHTML={{ __html: announcement.contenu }}
        />

        <div className="mt-6 flex justify-end border-t border-ink-100 pt-4">
          <ReportButton targetType="ANNONCE" targetId={announcement.id} />
        </div>
      </article>

      <div className="mt-6">
        <Comments
          targetType="ANNONCE"
          targetId={announcement.id}
          items={comments.map((comment) => ({
            id: comment.id,
            contenu: comment.contenu,
            createdAt: comment.createdAt.toISOString(),
            deletedAt: comment.deletedAt?.toISOString() ?? null,
            author: {
              id: comment.author.id,
              photoUrl: comment.author.photoUrl,
              role: comment.author.role,
              student: comment.author.student,
            },
          }))}
          currentUserId={user.id}
          canModerate={staff}
          canWrite={staff || isApprovedStudent(user)}
        />
      </div>
    </div>
  );
}
