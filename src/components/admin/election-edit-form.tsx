"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { ElectionStatus } from "@prisma/client";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { toLocalDateTimeInput } from "@/lib/utils";

export function ElectionEditForm({
  election,
}: {
  election: {
    id: string;
    titre: string;
    description: string | null;
    ouvreLe: string | null;
    fermeLe: string | null;
    statut: ElectionStatus;
  };
}) {
  const router = useRouter();
  const locked = !["BROUILLON", "CANDIDATURES"].includes(election.statut);
  const [form, setForm] = useState({
    titre: election.titre,
    description: election.description ?? "",
    ouvreLe: toLocalDateTimeInput(election.ouvreLe),
    fermeLe: toLocalDateTimeInput(election.fermeLe),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch(`/api/admin/elections/${election.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          titre: form.titre,
          description: form.description || null,
          ouvreLe: form.ouvreLe || null,
          fermeLe: form.fermeLe || null,
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
      {success ? <Alert variant="success">Élection mise à jour.</Alert> : null}
      {locked ? (
        <Alert variant="info" title="Élection verrouillée">
          Les informations et la fenêtre ne sont plus modifiables après l’ouverture du vote.
        </Alert>
      ) : null}

      <Field label="Titre" htmlFor="edit-election-titre">
        <Input
          id="edit-election-titre"
          value={form.titre}
          onChange={(event) => setForm({ ...form, titre: event.target.value })}
          disabled={locked}
          required
        />
      </Field>

      <Field label="Description" htmlFor="edit-election-description">
        <Textarea
          id="edit-election-description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          disabled={locked}
          className="min-h-[90px]"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ouverture" htmlFor="edit-election-open" hint="Heure de Madagascar (UTC+3).">
          <Input
            id="edit-election-open"
            type="datetime-local"
            value={form.ouvreLe}
            onChange={(event) => setForm({ ...form, ouvreLe: event.target.value })}
            disabled={locked}
          />
        </Field>
        <Field label="Fermeture" htmlFor="edit-election-close" hint="Heure de Madagascar (UTC+3).">
          <Input
            id="edit-election-close"
            type="datetime-local"
            value={form.fermeLe}
            onChange={(event) => setForm({ ...form, fermeLe: event.target.value })}
            disabled={locked}
          />
        </Field>
      </div>

      {!locked ? (
        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4" aria-hidden />
            Enregistrer
          </Button>
        </div>
      ) : null}
    </form>
  );
}
