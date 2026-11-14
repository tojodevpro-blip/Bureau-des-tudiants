import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { getAnnouncementForAdmin } from "@/server/services/announcements";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Modifier une annonce" };
export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;
  const [announcement, students] = await Promise.all([
    getAnnouncementForAdmin(id).catch(() => null),
    prisma.student.findMany({
      distinct: ["classe"],
      select: { classe: true },
      orderBy: { classe: "asc" },
    }),
  ]);
  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/annonces" className="link-quiet inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux annonces
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-950">Modifier l’annonce</h1>
        <p className="mt-1 text-sm text-ink-500">
          Créée par {announcement.createdBy.email} · dernière modification{" "}
          {formatDateTime(announcement.updatedAt)}
        </p>
      </div>

      <AnnouncementForm
        availableClasses={students.map((student) => student.classe)}
        initial={{
          id: announcement.id,
          titre: announcement.titre,
          contenu: announcement.contenu,
          categorie: announcement.categorie,
          imageUrl: announcement.imageUrl,
          cibleToutes: announcement.cibleToutes,
          classes: announcement.classes,
          epingle: announcement.epingle,
          urgent: announcement.urgent,
          publieLe: announcement.publieLe?.toISOString() ?? null,
          expireLe: announcement.expireLe?.toISOString() ?? null,
          statut: announcement.statut,
        }}
      />

      {announcement.revisions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Historique des versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcement.revisions.map((revision) => (
              <div key={revision.id} className="rounded-xl border border-ink-100 p-3">
                <p className="text-sm font-semibold text-ink-800">{revision.titre}</p>
                <p className="text-xs text-ink-400">
                  {formatDateTime(revision.createdAt)} · {revision.modifiedBy.email}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
