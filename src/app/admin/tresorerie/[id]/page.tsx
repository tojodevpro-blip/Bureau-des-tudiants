import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Receipt } from "lucide-react";
import { requireTreasuryPage } from "@/lib/auth/guard";
import {
  getTreasuryEntry,
  listTreasuryEvents,
} from "@/server/services/treasury";
import { buttonVariants } from "@/components/ui/button";
import { TreasuryEntryForm } from "@/components/admin/treasury-entry-form";

export const metadata = { title: "Modifier une opération" };
export const dynamic = "force-dynamic";

export default async function EditTreasuryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTreasuryPage();
  const { id } = await params;
  const [entry, events] = await Promise.all([
    getTreasuryEntry(id).catch(() => null),
    listTreasuryEvents(),
  ]);
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/tresorerie" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la trésorerie
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Trésorerie</p>
          <h1 className="text-2xl font-black tracking-tight text-ink-950">
            Modifier l’opération
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Les modifications sont journalisées dans l’audit.
          </p>
        </div>
        {entry.type === "RECETTE" ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/treasury/${entry.id}/recu`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <Receipt className="h-4 w-4" aria-hidden />
              Voir le reçu
            </a>
            <a
              href={`/api/admin/treasury/${entry.id}/recu?download=1`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Download className="h-4 w-4" aria-hidden />
              Télécharger
            </a>
          </div>
        ) : null}
      </div>
      <TreasuryEntryForm
        initial={{
          id: entry.id,
          type: entry.type,
          libelle: entry.libelle,
          categorie: entry.categorie,
          montant: entry.montant,
          date: entry.date.toISOString(),
          moyenPaiement: entry.moyenPaiement,
          reference: entry.reference,
          payeur: entry.payeur,
          note: entry.note,
          eventId: entry.eventId,
        }}
        events={events.map((event) => ({
          id: event.id,
          titre: event.titre,
          debut: event.debut.toISOString(),
        }))}
      />
    </div>
  );
}
