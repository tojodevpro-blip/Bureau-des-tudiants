"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function ReportActions({ id, statut }: { id: string; statut: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(next: "TRAITEE" | "REJETEE") {
    setLoading(next);
    setError(null);
    try {
      await apiFetch(`/api/admin/reports/${id}`, {
        method: "POST",
        body: JSON.stringify({ statut: next, resolution }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(null);
    }
  }

  if (statut !== "EN_ATTENTE") {
    return <span className="text-xs text-ink-400">{statut === "TRAITEE" ? "Traitée" : "Rejetée"}</span>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Check className="h-4 w-4" aria-hidden />
          Traiter
        </Button>
        <Button size="sm" variant="outline" onClick={() => handle("REJETEE")} loading={loading === "REJETEE"}>
          <X className="h-4 w-4" aria-hidden />
          Rejeter
        </Button>
      </div>
      <Modal
        open={open}
        onClose={() => (loading ? null : setOpen(false))}
        title="Traitement du signalement"
        description="Ajoute une note interne pour garder la décision motivée dans le journal d’audit."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading !== null}>
              Annuler
            </Button>
            <Button onClick={() => handle("TRAITEE")} loading={loading === "TRAITEE"}>
              Marquer traitée
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Field label="Note de traitement" htmlFor="resolution">
            <Input
              id="resolution"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              maxLength={1000}
              placeholder="Contenu supprimé, avertissement envoyé…"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
