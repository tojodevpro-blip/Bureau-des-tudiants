"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, RefreshCw, Upload } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ImportStatus = "NOUVEAU" | "EXISTANT" | "DOUBLON_FICHIER" | "INVALIDE";

type PreviewRow = {
  ligne: number;
  matricule: string;
  matriculeNormalise: string | null;
  nom: string;
  prenoms: string;
  classe: string;
  aVerifier: string;
  statut: ImportStatus;
  raison?: string;
};

type Preview = {
  rows: PreviewRow[];
  resume: {
    total: number;
    nouveaux: number;
    existants: number;
    doublons: number;
    invalides: number;
  };
  colonnesManquantes: string[];
};

type Report = {
  total: number;
  ajoutes: number;
  ignores: number;
  erreurs: { matricule: string; message: string }[];
};

const badgeVariant: Record<ImportStatus, "success" | "neutral" | "warning" | "danger"> = {
  NOUVEAU: "success",
  EXISTANT: "neutral",
  DOUBLON_FICHIER: "warning",
  INVALIDE: "danger",
};

const badgeLabel: Record<ImportStatus, string> = {
  NOUVEAU: "Nouveau",
  EXISTANT: "Existant",
  DOUBLON_FICHIER: "Doublon",
  INVALIDE: "Invalide",
};

export function ImportClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setReport(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyze() {
    if (!file) {
      setError("Sélectionne d’abord un fichier CSV ou Excel.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await apiFetch<Preview>("/api/admin/import/preview", {
        method: "POST",
        body: form,
      });
      setPreview(data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’analyser le fichier.");
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    if (!preview) return;
    const rows = preview.rows
      .filter((row) => row.statut === "NOUVEAU")
      .map((row) => ({
        matricule: row.matriculeNormalise ?? row.matricule,
        nom: row.nom,
        prenoms: row.prenoms,
        classe: row.classe,
        aVerifier: row.aVerifier || null,
      }));

    if (rows.length === 0) {
      setError("Aucune nouvelle ligne à importer.");
      return;
    }

    setCommitting(true);
    setError(null);
    try {
      const data = await apiFetch<Report>("/api/admin/import/commit", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setReport(data);
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de finaliser l’import.");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="error" title="Import impossible">
          {error}
        </Alert>
      ) : null}

      {report ? (
        <Alert variant="success" title="Import terminé">
          <p>
            {report.ajoutes} matricule(s) ajouté(s), {report.ignores} ignoré(s)
            {report.erreurs.length > 0 ? `, ${report.erreurs.length} erreur(s)` : ""}.
          </p>
          {report.erreurs.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs">
              {report.erreurs.slice(0, 10).map((item) => (
                <li key={item.matricule}>
                  {item.matricule} : {item.message}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Choisir le fichier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/50 px-6 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40"
          >
            <FileUp className="h-8 w-8 text-brand-600" aria-hidden />
            <span className="text-sm font-semibold text-ink-800">
              {file ? file.name : "Clique pour sélectionner un fichier"}
            </span>
            <span className="text-xs text-ink-500">CSV ou Excel .xlsx · 5 Mo maximum</span>
            <input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setReport(null);
                setError(null);
              }}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={analyze} loading={loading} disabled={!file}>
              <Upload className="h-4 w-4" aria-hidden />
              Analyser le fichier
            </Button>
            {file || preview ? (
              <Button variant="ghost" onClick={reset} disabled={loading || committing}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                Réinitialiser
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>2. Aperçu avant validation</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{preview.resume.nouveaux} nouveaux</Badge>
              <Badge>{preview.resume.existants} existants</Badge>
              <Badge variant="warning">{preview.resume.doublons} doublons</Badge>
              <Badge variant="danger">{preview.resume.invalides} invalides</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.colonnesManquantes.length > 0 ? (
              <Alert variant="error" title="Colonnes manquantes">
                {preview.colonnesManquantes.join(", ")}
              </Alert>
            ) : null}

            <div className="max-h-[460px] overflow-auto rounded-xl border border-ink-100">
              <table className="data-table min-w-[760px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Ligne</th>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Prénoms</th>
                    <th>Classe</th>
                    <th>Statut</th>
                    <th>Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={`${row.ligne}-${row.matricule}`}>
                      <td className="text-xs text-ink-400">{row.ligne}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold">
                            {row.matriculeNormalise ?? row.matricule}
                          </span>
                          {row.matriculeNormalise &&
                          row.matriculeNormalise !== row.matricule ? (
                            <span className="text-[10px] text-ink-400">
                              saisi : {row.matricule}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="text-xs">{row.nom || "—"}</td>
                      <td className="text-xs">{row.prenoms || "—"}</td>
                      <td className="text-xs">{row.classe || "—"}</td>
                      <td>
                        <Badge variant={badgeVariant[row.statut]}>
                          {badgeLabel[row.statut]}
                        </Badge>
                      </td>
                      <td className="max-w-[220px] text-xs text-ink-500">
                        {row.raison ?? (row.aVerifier ? `À vérifier : ${row.aVerifier}` : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-500">
                Seules les lignes « Nouveau » seront ajoutées. Les autres sont ignorées sans
                modification.
              </p>
              <Button
                onClick={commit}
                loading={committing}
                disabled={preview.resume.nouveaux === 0}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Importer {preview.resume.nouveaux} matricule(s)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
