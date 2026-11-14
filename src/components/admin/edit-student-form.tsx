"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function EditStudentForm({
  student,
  classes,
}: {
  student: {
    id: string;
    matricule: string;
    nom: string;
    prenoms: string;
    classe: string;
    noteVerification: string;
    actif: boolean;
  };
  classes: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(student);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          matricule: form.matricule,
          nom: form.nom,
          prenoms: form.prenoms,
          classe: form.classe,
          noteVerification: form.noteVerification || null,
          actif: form.actif,
        }),
      });
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="error" title="Enregistrement impossible">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" title="Modifications enregistrées">
          Les informations ont été mises à jour.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Matricule" htmlFor="edit-matricule" hint="Normalisé à l’enregistrement.">
          <Input
            id="edit-matricule"
            value={form.matricule}
            onChange={(event) => update("matricule", event.target.value)}
            required
          />
        </Field>
        <Field label="Classe" htmlFor="edit-classe">
          <Input
            id="edit-classe"
            list="edit-classes"
            value={form.classe}
            onChange={(event) => update("classe", event.target.value)}
            required
          />
          <datalist id="edit-classes">
            {classes.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de famille" htmlFor="edit-nom">
          <Input
            id="edit-nom"
            value={form.nom}
            onChange={(event) => update("nom", event.target.value)}
            required
          />
        </Field>
        <Field label="Prénoms" htmlFor="edit-prenoms">
          <Input
            id="edit-prenoms"
            value={form.prenoms}
            onChange={(event) => update("prenoms", event.target.value)}
            required
          />
        </Field>
      </div>

      <Field
        label="Note de vérification"
        htmlFor="edit-note"
        hint="Laisse vide si la transcription est certaine."
      >
        <Textarea
          id="edit-note"
          value={form.noteVerification}
          onChange={(event) => update("noteVerification", event.target.value)}
          className="min-h-[80px]"
        />
      </Field>

      <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-medium text-ink-800">
        <input
          type="checkbox"
          checked={form.actif}
          onChange={(event) => update("actif", event.target.checked)}
          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />
        Étudiant actif (autorisé à voter)
      </label>

      <div className="flex justify-end">
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4" aria-hidden />
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
