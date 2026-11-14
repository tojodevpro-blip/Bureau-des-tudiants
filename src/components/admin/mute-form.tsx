"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { toLocalDateTimeInput } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function MuteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motif, setMotif] = useState("");
  const [jusquAu, setJusquAu] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch("/api/admin/mutes", {
        method: "POST",
        body: JSON.stringify({ email, motif, jusquAu: jusquAu || null }),
      });
      setSuccess(true);
      setEmail("");
      setMotif("");
      setJusquAu("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de bloquer ce compte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">Compte bloqué pour le chat.</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email de l’étudiant" htmlFor="mute-email">
          <Input id="mute-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Jusqu’au (vide = permanent)" htmlFor="mute-until">
          <Input id="mute-until" type="datetime-local" value={toLocalDateTimeInput(jusquAu || null)} onChange={(event) => setJusquAu(event.target.value)} />
        </Field>
      </div>
      <Field label="Motif" htmlFor="mute-motif">
        <Input id="mute-motif" value={motif} onChange={(event) => setMotif(event.target.value)} required minLength={3} maxLength={300} placeholder="Visible en audit" />
      </Field>
      <Button type="submit" variant="danger" loading={loading}>
        <Ban className="h-4 w-4" aria-hidden />
        Bloquer du chat
      </Button>
    </form>
  );
}
