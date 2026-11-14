import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTreasuryPage } from "@/lib/auth/guard";
import { listTreasuryEvents } from "@/server/services/treasury";
import { TreasuryEntryForm } from "@/components/admin/treasury-entry-form";

export const metadata = { title: "Nouvelle opération" };
export const dynamic = "force-dynamic";

export default async function NewTreasuryEntryPage() {
  await requireTreasuryPage();
  const events = await listTreasuryEvents();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/tresorerie" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la trésorerie
      </Link>
      <div>
        <p className="label-caps">Trésorerie</p>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">
          Nouvelle opération
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Enregistre une recette ou une dépense avec son moyen de paiement.
        </p>
      </div>
      <TreasuryEntryForm
        events={events.map((event) => ({
          id: event.id,
          titre: event.titre,
          debut: event.debut.toISOString(),
        }))}
      />
    </div>
  );
}
