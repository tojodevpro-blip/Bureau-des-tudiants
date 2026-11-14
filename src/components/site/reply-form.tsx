"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";

export function ReplyForm({
  requestId,
  isStaff,
  templates = [],
}: {
  requestId: string;
  isStaff: boolean;
  templates?: { id: string; titre: string; contenu: string }[];
}) {
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [interne, setInterne] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}/replies`, {
        method: "POST",
        body: JSON.stringify({ contenu, interne: isStaff ? interne : false }),
      });
      setContenu("");
      setInterne(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’envoyer la réponse.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {isStaff && templates.length > 0 ? (
        <select
          onChange={(event) => {
            const template = templates.find((item) => item.id === event.target.value);
            if (template) setContenu(template.contenu);
          }}
          defaultValue=""
          className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm"
          aria-label="Insérer un modèle de réponse"
        >
          <option value="">Insérer un modèle de réponse…</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.titre}</option>
          ))}
        </select>
      ) : null}
      <Textarea
        value={contenu}
        onChange={(event) => setContenu(event.target.value)}
        rows={4}
        maxLength={5000}
        required
        placeholder={isStaff ? "Réponse à l’étudiant ou note interne…" : "Écris ta réponse…"}
        aria-label="Message"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isStaff ? (
          <label className="inline-flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={interne}
              onChange={(event) => setInterne(event.target.checked)}
              className="h-4 w-4 rounded border-ink-300"
            />
            Note interne (non visible par l’étudiant)
          </label>
        ) : <span />}
        <Button type="submit" loading={loading} disabled={!contenu.trim()}>
          <Send className="h-4 w-4" aria-hidden />
          Envoyer
        </Button>
      </div>
    </form>
  );
}
