"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";

export function StudentRowActions({
  id,
  actif,
  claimed,
  hasVoted,
}: {
  id: string;
  actif: boolean;
  claimed: boolean;
  hasVoted: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"toggle" | "reset" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/students/${id}`, {
        method: "POST",
        body: JSON.stringify({ actif: !actif }),
      });
      setMode(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function resetClaim() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/students/${id}/reset-claim`, { method: "POST" });
      setMode(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/etudiants/${id}`}
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        title="Modifier"
        aria-label="Modifier"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode("toggle");
        }}
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        title={actif ? "Désactiver" : "Réactiver"}
        aria-label={actif ? "Désactiver" : "Réactiver"}
      >
        {actif ? <Ban className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      </button>
      {claimed ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode("reset");
          }}
          className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"
          title="Réinitialiser la réclamation"
          aria-label="Réinitialiser la réclamation"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      ) : null}

      <Modal
        open={mode === "toggle"}
        onClose={() => (loading ? null : setMode(null))}
        title={actif ? "Désactiver cet étudiant ?" : "Réactiver cet étudiant ?"}
        description={
          actif
            ? "Le compte ne pourra plus voter tant que l’étudiant est désactivé."
            : "L’étudiant pourra de nouveau voter si son compte est approuvé."
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMode(null)} disabled={loading}>
              Annuler
            </Button>
            <Button
              variant={actif ? "danger" : "primary"}
              onClick={toggleActive}
              loading={loading}
            >
              {actif ? "Désactiver" : "Réactiver"}
            </Button>
          </>
        }
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
      </Modal>

      <Modal
        open={mode === "reset"}
        onClose={() => (loading ? null : setMode(null))}
        title="Réinitialiser la réclamation ?"
        description="Le compte actuellement associé sera rejeté et le matricule redeviendra libre. À utiliser en cas d’usurpation."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMode(null)} disabled={loading}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={resetClaim}
              loading={loading}
              disabled={hasVoted}
            >
              Réinitialiser
            </Button>
          </>
        }
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
        {hasVoted ? (
          <Alert variant="warning" title="Ce compte a déjà voté">
            La réinitialisation est bloquée pour préserver l’intégrité du scrutin. Contacte
            l’administrateur technique.
          </Alert>
        ) : (
          <p className="text-sm text-ink-500">
            L’étudiant légitime pourra alors créer un nouveau compte avec ce matricule.
          </p>
        )}
      </Modal>
    </div>
  );
}
