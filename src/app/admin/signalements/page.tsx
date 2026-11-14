import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { listReports } from "@/server/services/reports";
import { parsePagination } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ReportActions } from "@/components/admin/report-actions";

export const metadata: Metadata = { title: "Signalements" };
export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  ANNONCE: "Annonce",
  COMMENTAIRE: "Commentaire",
  MESSAGE: "Message",
  PHOTO: "Photo",
  DEMANDE: "Demande",
  EVENEMENT: "Événement",
};

const links: Record<string, string> = {
  ANNONCE: "/annonces",
  MESSAGE: "/communication",
  PHOTO: "/archives",
  DEMANDE: "/admin/demandes",
  EVENEMENT: "/programme",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; statut?: string }>;
}) {
  await requireStaffPage();
  const query = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(query.page) });
  const statut =
    query.statut === "TRAITEE" || query.statut === "REJETEE" || query.statut === "EN_ATTENTE"
      ? query.statut
      : undefined;
  const data = await listReports({ statut, page, pageSize });

  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Modération</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          <Flag className="h-6 w-6 text-brand-700" aria-hidden />
          Signalements
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          File générique pour les annonces, commentaires, messages, photos, demandes et événements.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ["", "Tous"],
          ["EN_ATTENTE", "En attente"],
          ["TRAITEE", "Traités"],
          ["REJETEE", "Rejetés"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/admin/signalements?statut=${value}` : "/admin/signalements"}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              (query.statut ?? "") === value
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-ink-200 bg-white text-ink-600"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-9 w-9" />}
          title="Aucun signalement"
          description="La file de modération est vide pour ce filtre."
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((report) => (
            <Card key={report.id}>
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={report.statut === "EN_ATTENTE" ? "warning" : report.statut === "TRAITEE" ? "success" : "neutral"}>
                      {report.statut === "EN_ATTENTE" ? "En attente" : report.statut === "TRAITEE" ? "Traitée" : "Rejetée"}
                    </Badge>
                    <span className="text-xs font-semibold text-ink-600">{labels[report.targetType]}</span>
                    <span className="text-xs text-ink-400">{formatDateTime(report.createdAt)}</span>
                  </div>
                  <p className="font-semibold text-ink-950">{report.motif}</p>
                  {report.details ? <p className="text-sm text-ink-600">{report.details}</p> : null}
                  <p className="text-xs text-ink-400">
                    Signalé par{" "}
                    {report.reporter?.student
                      ? `${report.reporter.student.prenoms} ${report.reporter.student.nom}`
                      : report.reporter?.email ?? "un compte supprimé"}
                  </p>
                  {links[report.targetType] ? (
                    <Link className="link-quiet inline-block" href={links[report.targetType]}>
                      Ouvrir l’espace concerné
                    </Link>
                  ) : null}
                  {report.resolution ? (
                    <p className="rounded-lg bg-ink-50 p-2 text-xs text-ink-500">
                      Résolution : {report.resolution}
                    </p>
                  ) : null}
                </div>
                <ReportActions id={report.id} statut={report.statut} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        total={data.total}
        pageSize={pageSize}
        basePath="/admin/signalements"
        query={{ statut: query.statut }}
      />
    </div>
  );
}
