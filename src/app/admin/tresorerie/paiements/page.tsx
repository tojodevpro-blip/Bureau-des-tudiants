import Link from "next/link";
import { ArrowLeft, CreditCard, LockKeyhole, Smartphone } from "lucide-react";
import { requireTreasuryPage } from "@/lib/auth/guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Paiements en ligne" };
export const dynamic = "force-dynamic";

const providers = [
  {
    name: "MVola",
    description: "Paiement mobile Telma pour les cotisations et billets d’événements.",
    icon: Smartphone,
  },
  {
    name: "Airtel Money",
    description: "Paiement mobile Airtel pour les inscriptions et contributions.",
    icon: Smartphone,
  },
];

export default async function OnlinePaymentsPage() {
  await requireTreasuryPage();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/tresorerie" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la trésorerie
      </Link>
      <div>
        <p className="label-caps">Trésorerie</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950">
          <CreditCard className="h-6 w-6 text-brand-700" aria-hidden />
          Paiements en ligne
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Intégration MVola et Airtel Money — fonctionnalités à venir.
        </p>
      </div>

      <Alert variant="info" title="Aucune transaction réelle n’est possible pour le moment">
        Les API marchand de MVola et Airtel Money ne sont pas encore configurées. Les boutons de
        paiement restent désactivés et aucun argent ne peut être débité depuis cette page.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.name}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <provider.icon className="h-5 w-5 text-brand-700" aria-hidden />
                  {provider.name}
                </CardTitle>
              </div>
              <Badge variant="warning">Bientôt</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-ink-500">{provider.description}</p>
              <button
                type="button"
                disabled
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-ink-50 text-sm font-semibold text-ink-400"
              >
                <LockKeyhole className="h-4 w-4" aria-hidden />
                Paiement indisponible
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prérequis avant activation</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
            <li>Compte marchand validé chez MVola et Airtel Money.</li>
            <li>Clés API, identifiants et URL de callback fournis par les opérateurs.</li>
            <li>URL HTTPS publique pour recevoir les confirmations de paiement.</li>
            <li>Rapprochement automatique entre transaction, étudiant et recette.</li>
            <li>Test en bac à sable puis validation par le trésorier avant mise en service.</li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ink-400">
            En attendant, continue à saisir les encaissements MVola/Airtel Money comme moyens de
            paiement manuels dans la trésorerie.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
