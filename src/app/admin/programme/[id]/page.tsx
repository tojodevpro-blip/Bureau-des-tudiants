import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { getEventForAdmin } from "@/server/services/events";
import { buttonVariants } from "@/components/ui/button";
import { EventForm } from "@/components/admin/event-form";

export const metadata = { title: "Modifier un événement" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  await requireModule("programme");
  const { id } = await params;
  const event = await getEventForAdmin(id).catch(() => null);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/programme" className="link-quiet inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour au programme
        </Link>
        <Link href={`/admin/programme/${event.id}/presences`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ClipboardCheck className="h-4 w-4" aria-hidden />
          Gérer les présences
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">Modifier l’événement</h1>
        <p className="mt-1 text-sm text-ink-500">{event._count.rsvps} inscription(s) au total.</p>
      </div>
      <EventForm
        initial={{
          id: event.id,
          titre: event.titre,
          description: event.description,
          lieu: event.lieu,
          debut: event.debut.toISOString(),
          fin: event.fin.toISOString(),
          visuelUrl: event.visuelUrl,
          categorie: event.categorie,
          capacite: event.capacite,
          prixModalites: event.prixModalites,
          annuleLe: event.annuleLe?.toISOString() ?? null,
        }}
      />
    </div>
  );
}
