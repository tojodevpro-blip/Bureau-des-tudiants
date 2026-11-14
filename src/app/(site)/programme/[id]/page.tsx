import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { getCurrentUser, isApprovedStudent } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { getEventForUser } from "@/server/services/events";
import { listComments } from "@/server/services/comments";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Comments } from "@/components/site/comments";
import { EventRsvpButton } from "@/components/site/event-rsvp-button";
import { ReportButton } from "@/components/site/report-button";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModule("programme");
  const user = await getCurrentUser();
  const { id } = await params;
  const event = await getEventForUser(id, user?.id ?? null).catch(() => null);
  if (!event) notFound();

  const rsvp = user ? event.rsvps?.[0] ?? null : null;
  const comments = await listComments("EVENEMENT", id);
  const past = event.fin < new Date();
  const places = event.capacite ? Math.max(0, event.capacite - event._count.rsvps) : null;
  const qr =
    rsvp?.statut === "INSCRIT"
      ? await QRCode.toDataURL(rsvp.qrToken, { width: 320, margin: 1, color: { dark: "#106953" } })
      : null;
  const canWrite = Boolean(user && (isApprovedStudent(user) || user.role !== "STUDENT"));

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <Link href="/programme" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au programme
      </Link>

      {event.visuelUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.visuelUrl} alt="" className="mt-4 max-h-80 w-full rounded-2xl border border-ink-100 object-cover" />
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{event.categorie}</Badge>
        {event.annuleLe ? <Badge variant="danger">Événement annulé</Badge> : past ? <Badge variant="warning">Terminé</Badge> : <Badge variant="success">À venir</Badge>}
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">{event.titre}</h1>
      <div className="mt-3 space-y-1 text-sm text-ink-600">
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-brand-700" aria-hidden /> Du {formatDateTime(event.debut)} au {formatDateTime(event.fin)}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-700" aria-hidden /> {event.lieu}</p>
        {places !== null ? <p className="flex items-center gap-2"><Users className="h-4 w-4 text-brand-700" aria-hidden /> {places} place(s) restante(s) sur {event.capacite}</p> : null}
        {event.prixModalites ? <p className="font-medium text-ink-700">{event.prixModalites}</p> : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {user?.role === "STUDENT" && !past && !event.annuleLe ? (
          <EventRsvpButton eventId={event.id} statut={rsvp?.statut ?? null} disabled={!isApprovedStudent(user)} />
        ) : null}
        <a href={`/api/events/${event.id}/ics`} className={buttonVariants({ variant: "outline" })}>
          <CalendarDays className="h-4 w-4" aria-hidden />
          Ajouter à mon calendrier
        </a>
        <ReportButton targetType="EVENEMENT" targetId={event.id} />
      </div>

      {user?.role === "STUDENT" && !isApprovedStudent(user) ? (
        <Alert variant="warning" className="mt-4" title="Inscription indisponible">
          Ton compte doit être approuvé par le BDE pour t’inscrire à un événement.
        </Alert>
      ) : null}

      {rsvp?.statut === "LISTE_ATTENTE" ? (
        <Alert variant="warning" className="mt-4" title="Tu es sur la liste d’attente">
          Tu recevras une notification si une place se libère.
        </Alert>
      ) : null}

      {qr && rsvp ? (
        <section className="surface mt-5 flex flex-col items-center gap-3 p-6 text-center">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink-950">
            <Ticket className="h-5 w-5 text-brand-700" aria-hidden />
            Ton billet de présence
          </h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code de présence à présenter à l’entrée" className="h-56 w-56 rounded-xl border border-ink-100 bg-white theme-fixed-light p-2" />
          <p className="max-w-sm text-xs text-ink-500">
            Présente ce QR à l’entrée. Il est personnel : ne le partage pas. Il ne remplace pas le
            paiement sur place s’il y en a un.
          </p>
          {rsvp.checkedInAt ? (
            <p className="text-xs font-semibold text-brand-700">
              Présence validée le {formatDateTime(rsvp.checkedInAt)}.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="rich-content mt-6">
        <p className="whitespace-pre-line">{event.description}</p>
      </div>

      <div className="mt-8">
        <Comments
          targetType="EVENEMENT"
          targetId={event.id}
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
          currentUserId={user?.id ?? null}
          canModerate={Boolean(user && user.role !== "STUDENT")}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
