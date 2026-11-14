import Link from "next/link";
import { ArrowRight, MessagesSquare, PlusCircle, Search } from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { listMyRequests, requestNumber } from "@/server/services/requests";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANTS } from "@/lib/request-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Mes demandes" };
export const dynamic = "force-dynamic";

export default async function MyRequestsPage() {
  const user = await requireStudentPage();
  await requireModule("demandes");
  const requests = await listMyRequests(user.id);

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Support</p>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
            <MessagesSquare className="h-7 w-7 text-brand-700" aria-hidden />
            Mes demandes
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Pose une question au BDE et suis la réponse. Une demande résolue reste rouvrable 7 jours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/faq" className={buttonVariants({ variant: "outline" })}>
            <Search className="h-4 w-4" aria-hidden />
            Consulter la FAQ
          </Link>
          <Link href="/demandes/nouvelle" className={buttonVariants()}>
            <PlusCircle className="h-4 w-4" aria-hidden />
            Nouvelle demande
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<MessagesSquare className="h-10 w-10" />}
          title="Aucune demande"
          description="Tu n’as pas encore contacté le BDE. Crée une demande, elle sera traitée par un membre de l’équipe."
          action={
            <Link href="/demandes/nouvelle" className={buttonVariants()}>
              Créer ma première demande
            </Link>
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={REQUEST_STATUS_VARIANTS[request.statut]}>
                      {REQUEST_STATUS_LABELS[request.statut]}
                    </Badge>
                    <span className="text-xs font-semibold text-ink-400">{requestNumber(request.numero)}</span>
                    <span className="text-xs text-ink-500">{request.categorie}</span>
                  </div>
                  <h2 className="mt-2 truncate text-lg font-bold text-ink-950">{request.sujet}</h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {request._count.replies} réponse(s) · mise à jour le {formatDateTime(request.updatedAt)}
                  </p>
                </div>
                <Link
                  href={`/demandes/${request.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}
                >
                  Ouvrir
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
