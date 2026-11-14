import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Users } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { getEventForAdmin } from "@/server/services/events";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckinForm } from "@/components/admin/checkin-form";

export const metadata = { title: "Présences" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  await requireModule("programme");
  const { id } = await params;
  const event = await getEventForAdmin(id).catch(() => null);
  if (!event) notFound();
  const checkedIn = event.rsvps.filter((rsvp) => rsvp.checkedInAt).length;
  const registered = event.rsvps.filter((rsvp) => rsvp.statut === "INSCRIT").length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href={`/admin/programme/${event.id}`} className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à l’événement
      </Link>
      <div>
        <p className="label-caps">Présences</p>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">{event.titre}</h1>
        <p className="text-sm text-ink-500">{formatDateTime(event.debut)} · {event.lieu}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="flex items-center gap-1 text-xs text-ink-500"><Users className="h-3.5 w-3.5" aria-hidden />Inscrits</p><p className="mt-1 text-2xl font-black text-ink-950">{registered}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="flex items-center gap-1 text-xs text-ink-500"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Présents</p><p className="mt-1 text-2xl font-black text-ink-950">{checkedIn}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="flex items-center gap-1 text-xs text-ink-500"><Clock3 className="h-3.5 w-3.5" aria-hidden />Attente</p><p className="mt-1 text-2xl font-black text-ink-950">{event.rsvps.filter((rsvp) => rsvp.statut === "LISTE_ATTENTE").length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Valider un billet</CardTitle></CardHeader>
        <CardContent><CheckinForm eventId={event.id} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Inscriptions ({event.rsvps.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {event.rsvps.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">Aucune inscription.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Étudiant</th><th>Classe</th><th>Statut</th><th>Présence</th></tr></thead>
                <tbody>
                  {event.rsvps.map((rsvp) => (
                    <tr key={rsvp.id}>
                      <td>
                        <p className="font-medium text-ink-900">
                          {rsvp.user.student ? `${rsvp.user.student.prenoms} ${rsvp.user.student.nom}` : "Compte sans fiche"}
                        </p>
                        <p className="text-xs text-ink-400">{rsvp.user.student?.matricule ?? rsvp.user.email ?? "—"}</p>
                      </td>
                      <td>{rsvp.user.student?.classe ?? "—"}</td>
                      <td>
                        <Badge variant={rsvp.statut === "INSCRIT" ? "success" : rsvp.statut === "LISTE_ATTENTE" ? "warning" : "neutral"}>
                          {rsvp.statut === "INSCRIT" ? "Inscrit" : rsvp.statut === "LISTE_ATTENTE" ? "Liste d’attente" : "Annulé"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap text-xs text-ink-500">
                        {rsvp.checkedInAt ? formatDateTime(rsvp.checkedInAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
