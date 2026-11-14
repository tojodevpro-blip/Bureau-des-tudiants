import { UploadCloud } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { ImportClient } from "@/components/admin/import-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "Import CSV / Excel" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdminPage();
  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Gestion</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          <UploadCloud className="h-6 w-6 text-brand-700" aria-hidden />
          Importer des matricules
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Ajoute des étudiants depuis un fichier CSV ou Excel. Un aperçu est toujours affiché
          avant l’enregistrement.
        </p>
      </div>

      <Alert variant="warning" title="Règles de sécurité">
        L’import ne supprime jamais de données et ne modifie pas les comptes existants. Les
        lignes déjà présentes sont ignorées. Le fichier source contient des données
        personnelles : ne le committe pas et supprime-le après import.
      </Alert>

      <ImportClient />

      <Card>
        <CardHeader>
          <CardTitle>Format attendu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-ink-600">
          <p>
            Colonnes obligatoires : <code className="rounded bg-ink-100 px-1.5 py-0.5">matricule</code>,{" "}
            <code className="rounded bg-ink-100 px-1.5 py-0.5">nom</code>,{" "}
            <code className="rounded bg-ink-100 px-1.5 py-0.5">prenoms</code>,{" "}
            <code className="rounded bg-ink-100 px-1.5 py-0.5">classe</code>. Colonne
            optionnelle : <code className="rounded bg-ink-100 px-1.5 py-0.5">a_verifier</code>.
          </p>
          <p>
            Les matricules peuvent être saisis avec <code>/</code>, <code>-</code> ou un
            espace : <code>CAN31/01</code>, <code>CAN31-1</code> et <code>CAN31 1</code> sont
            tous normalisés en <code>CAN31/001</code>.
          </p>
          <p>
            Taille maximale : 5 Mo, 2 000 lignes par import. Pour Excel, utilise le format{" "}
            <code>.xlsx</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
