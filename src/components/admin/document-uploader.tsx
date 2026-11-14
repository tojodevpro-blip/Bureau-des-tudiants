"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export function DocumentUploader() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("Documents officiels");
  const [dateDocument, setDateDocument] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("titre", titre);
      body.append("description", description);
      body.append("categorie", categorie);
      body.append("dateDocument", `${dateDocument}T00:00`);
      await apiFetch("/api/admin/documents", { method: "POST", body });
      setSuccess(true);
      setTitre("");
      setDescription("");
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’ajouter le document.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">Document ajouté.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" htmlFor="doc-titre">
          <Input id="doc-titre" value={titre} onChange={(event) => setTitre(event.target.value)} required minLength={2} maxLength={180} />
        </Field>
        <Field label="Catégorie" htmlFor="doc-categorie">
          <Input id="doc-categorie" value={categorie} onChange={(event) => setCategorie(event.target.value)} required maxLength={60} list="document-categories" />
          <datalist id="document-categories">
            {["Documents officiels", "Règlement", "Compte rendu", "Budget", "Formulaire"].map((item) => <option key={item} value={item} />)}
          </datalist>
        </Field>
      </div>
      <Field label="Description (facultatif)" htmlFor="doc-description">
        <Textarea id="doc-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={2000} />
      </Field>
      <Field label="Date du document" htmlFor="doc-date">
        <Input id="doc-date" type="date" value={dateDocument} onChange={(event) => setDateDocument(event.target.value)} required />
      </Field>
      <Field label="Fichier" htmlFor="doc-file" hint="PDF, DOCX ou XLSX · 10 Mo maximum.">
        <Input id="doc-file" type="file" accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
      </Field>
      <Button type="submit" loading={loading} disabled={!file || titre.length < 2}>
        <FileUp className="h-4 w-4" aria-hidden />
        Ajouter le document
      </Button>
    </form>
  );
}
