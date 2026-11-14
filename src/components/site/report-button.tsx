"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

export function ReportButton({
  targetType,
  targetId,
  label = "Signaler",
}: {
  targetType: "ANNONCE" | "COMMENTAIRE" | "MESSAGE" | "PHOTO" | "DEMANDE" | "EVENEMENT";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          motif,
          details: details || null,
        }),
      });
      setMessage("Signalement envoyé à l’équipe BDE. Merci.");
      setMotif("");
      setDetails("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’envoyer le signalement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-red-700"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>
      <Modal
        open={open}
        onClose={() => (loading ? null : setOpen(false))}
        title="Signaler ce contenu"
        description="Un membre du BDE examinera ton signalement. Ton identité n’est pas publiée."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Fermer
            </Button>
            <Button onClick={submit} loading={loading} disabled={motif.trim().length < 3}>
              Envoyer le signalement
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {message ? <Alert variant="success" title="Signalement envoyé">{message}</Alert> : null}
          {error ? <Alert variant="error" title="Erreur">{error}</Alert> : null}
          <Field label="Motif" htmlFor="report-motif">
            <Input
              id="report-motif"
              value={motif}
              onChange={(event) => setMotif(event.target.value)}
              placeholder="Contenu choquant, harcèlement…"
              maxLength={160}
            />
          </Field>
          <Field label="Précisions (facultatif)" htmlFor="report-details">
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
