import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, Lock, UserRound } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANTS } from "@/lib/request-status";
import { getRequestForStaff, listTemplates, requestNumber } from "@/server/services/requests";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaqToggle } from "@/components/admin/faq-toggle";
import { ReplyForm } from "@/components/site/reply-form";
import { RequestActions } from "@/components/site/request-actions";

export const dynamic = "force-dynamic";

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaffPage();
  await requireModule("demandes");
  const { id } = await params;
  const [request, templates] = await Promise.all([
    getRequestForStaff(id).catch(() => null),
    listTemplates(),
  ]);
  if (!request) notFound();
  const hideIdentity = request.anonyme && staff.role !== "ADMIN";
  const student = request.student ?? request.user.student;
  const name = hideIdentity
    ? "Étudiant anonyme"
    : student
      ? `${student.prenoms} ${student.nom}`
      : request.user.email ?? "Étudiant";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/admin/demandes" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux demandes
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={REQUEST_STATUS_VARIANTS[request.statut]}>{REQUEST_STATUS_LABELS[request.statut]}</Badge>
            <span className="text-sm font-semibold text-ink-400">{requestNumber(request.numero)}</span>
            <span className="text-sm text-ink-500">{request.categorie}</span>
            {request.anonyme ? <Badge variant="warning">Anonymat demandé</Badge> : null}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-950">{request.sujet}</h1>
          <p className="mt-1 text-sm text-ink-500">
            Créée le {formatDateTime(request.createdAt)} · dernière activité {formatDateTime(request.updatedAt)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <RequestActions
            requestId={request.id}
            statut={request.statut}
            isStaff
            canReopen={false}
            canAssign={request.assignedToId !== staff.id}
          />
          <FaqToggle requestId={request.id} publiee={request.faqPubliee} />
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="label-caps">Étudiant</p>
            <p className="mt-1 font-semibold text-ink-900">{name}</p>
            {!hideIdentity && student ? (
              <p className="text-sm text-ink-500">{student.matricule} · {student.classe}</p>
            ) : null}
            {!hideIdentity ? (
              <p className="text-sm text-ink-500">{request.user.email ?? request.user.telephone ?? "—"}</p>
            ) : (
              <p className="text-sm text-ink-500">Identité réservée aux administrateurs.</p>
            )}
          </div>
          <div>
            <p className="label-caps">Suivi</p>
            <p className="mt-1 text-sm text-ink-700">
              Assignée à : {request.assignedTo?.email ?? "personne"}
            </p>
            {request.reopenUntil ? (
              <p className="text-sm text-ink-500">Rouvrable jusqu’au {formatDateTime(request.reopenUntil)}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-brand-700" aria-hidden />
            Message initial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{request.message}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {request.replies.map((reply) => (
          <Card key={reply.id} className={reply.interne ? "border-amber-200 bg-amber-50/40" : undefined}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink-900">
                  {reply.author.role === "STUDENT" ? name : reply.author.email}
                </span>
                {reply.interne ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                    <Lock className="h-3 w-3" aria-hidden />
                    Note interne
                  </span>
                ) : null}
                <time className="inline-flex items-center gap-1 text-xs text-ink-400" dateTime={reply.createdAt.toISOString()}>
                  <Clock3 className="h-3 w-3" aria-hidden />
                  {formatDateTime(reply.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{reply.contenu}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Répondre</CardTitle></CardHeader>
        <CardContent>
          <ReplyForm
            requestId={request.id}
            isStaff
            templates={templates.map((template) => ({
              id: template.id,
              titre: template.titre,
              contenu: template.contenu,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
