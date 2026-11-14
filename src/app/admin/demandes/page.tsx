import Link from "next/link";
import type { RequestStatus } from "@prisma/client";
import { ArrowRight, MessagesSquare } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { parsePagination } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANTS } from "@/lib/request-status";
import { listRequestsForStaff, requestNumber } from "@/server/services/requests";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";

export const metadata = { title: "Demandes étudiantes" };
export const dynamic = "force-dynamic";

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; statut?: string }>;
}) {
  const staff = await requireStaffPage();
  await requireModule("demandes");
  const params = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(params.page) });
  const statut = ["OUVERTE", "EN_COURS", "RESOLUE", "FERMEE"].includes(params.statut ?? "")
    ? (params.statut as RequestStatus)
    : undefined;
  const { items, total, counts } = await listRequestsForStaff({
    page,
    pageSize,
    statut,
    search: params.q?.trim() || undefined,
  });
  const countFor = (key: RequestStatus) => counts.find((count) => count.statut === key)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Support</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          <MessagesSquare className="h-6 w-6 text-brand-700" aria-hidden />
          Demandes étudiantes
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Réponds, assigne, résous ou publie une réponse dans la FAQ.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["OUVERTE", "EN_COURS", "RESOLUE", "FERMEE"] as RequestStatus[]).map((key) => (
          <Link
            key={key}
            href={`/admin/demandes?statut=${key}`}
            className="surface p-4 transition hover:border-brand-200"
          >
            <p className="text-2xl font-black text-ink-950">{countFor(key)}</p>
            <p className="text-xs font-medium text-ink-500">{REQUEST_STATUS_LABELS[key]}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input name="q" defaultValue={params.q ?? ""} placeholder="Sujet, email, matricule…" aria-label="Rechercher une demande" className="sm:max-w-sm" />
            <Select name="statut" defaultValue={params.statut ?? ""} aria-label="Filtrer par statut" className="sm:max-w-[180px]">
              <option value="">Tous les statuts</option>
              {(["OUVERTE", "EN_COURS", "RESOLUE", "FERMEE"] as RequestStatus[]).map((key) => (
                <option key={key} value={key}>{REQUEST_STATUS_LABELS[key]}</option>
              ))}
            </Select>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrer</button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={<MessagesSquare className="h-10 w-10" />} title="Aucune demande" description="Aucune demande ne correspond à ces filtres." />
      ) : (
        <div className="space-y-3">
          {items.map((request) => {
            const hideIdentity = request.anonyme && staff.role !== "ADMIN";
            const name = hideIdentity
              ? "Étudiant anonyme"
              : request.student
                ? `${request.student.prenoms} ${request.student.nom}`
                : request.user.email ?? "Étudiant";
            return (
              <Card key={request.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={REQUEST_STATUS_VARIANTS[request.statut]}>{REQUEST_STATUS_LABELS[request.statut]}</Badge>
                      <span className="text-xs font-semibold text-ink-400">{requestNumber(request.numero)}</span>
                      <span className="text-xs text-ink-500">{request.categorie}</span>
                      {request.assignedTo ? <span className="text-xs text-ink-400">· {request.assignedTo.email}</span> : null}
                    </div>
                    <h2 className="mt-2 truncate text-base font-bold text-ink-950">{request.sujet}</h2>
                    <p className="text-xs text-ink-500">
                      {name}
                      {request.student ? ` · ${request.student.classe}` : ""} · {request._count.replies} réponse(s) · {formatDateTime(request.updatedAt)}
                    </p>
                  </div>
                  <Link href={`/admin/demandes/${request.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}>
                    Traiter
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/admin/demandes" query={{ q: params.q, statut: params.statut }} />
        </div>
      )}
    </div>
  );
}
