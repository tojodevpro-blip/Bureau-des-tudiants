import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, UserRound } from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { getRequestForStudent, requestNumber } from "@/server/services/requests";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANTS } from "@/lib/request-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplyForm } from "@/components/site/reply-form";
import { RequestActions } from "@/components/site/request-actions";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudentPage();
  await requireModule("demandes");
  const { id } = await params;
  const request = await getRequestForStudent(id, user.id).catch(() => null);
  if (!request) notFound();
  const canReopen = request.statut === "RESOLUE" && Boolean(request.reopenUntil && request.reopenUntil > new Date());

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <Link href="/demandes" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à mes demandes
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={REQUEST_STATUS_VARIANTS[request.statut]}>{REQUEST_STATUS_LABELS[request.statut]}</Badge>
        <span className="text-sm font-semibold text-ink-400">{requestNumber(request.numero)}</span>
        <span className="text-sm text-ink-500">{request.categorie}</span>
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-950">{request.sujet}</h1>
      <p className="mt-1 text-sm text-ink-500">
        Créée le {formatDateTime(request.createdAt)}
        {request.assignedTo ? ` · prise en charge par ${request.assignedTo.email}` : ""}
      </p>

      <div className="mt-5">
        <RequestActions
          requestId={request.id}
          statut={request.statut}
          isStaff={false}
          canReopen={canReopen}
          canAssign={false}
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-brand-700" aria-hidden />
            Ta demande
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{request.message}</p>
        </CardContent>
      </Card>

      <div className="mt-5 space-y-3">
        {request.replies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-4 text-sm text-ink-500">
            Aucune réponse pour le moment. L’équipe BDE a été notifiée.
          </p>
        ) : (
          request.replies.map((reply) => (
            <Card key={reply.id} className={reply.author.role === "STUDENT" ? "bg-ink-50/50" : "border-brand-100"}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">
                    {reply.author.role === "STUDENT" ? "Toi" : "Équipe BDE"}
                  </span>
                  <time className="inline-flex items-center gap-1 text-xs text-ink-400" dateTime={reply.createdAt.toISOString()}>
                    <Clock3 className="h-3 w-3" aria-hidden />
                    {formatDateTime(reply.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">{reply.contenu}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {request.statut !== "FERMEE" ? (
        <Card className="mt-5">
          <CardHeader><CardTitle className="text-base">Répondre</CardTitle></CardHeader>
          <CardContent><ReplyForm requestId={request.id} isStaff={false} /></CardContent>
        </Card>
      ) : (
        <p className="mt-5 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm text-ink-500">
          Cette demande est fermée. Crée une nouvelle demande si nécessaire.
        </p>
      )}
    </div>
  );
}
