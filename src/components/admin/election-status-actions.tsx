"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Megaphone, RotateCcw, Trophy } from "lucide-react";
import type { ElectionStatus } from "@prisma/client";
import { ALLOWED_TRANSITIONS } from "@/lib/election-status";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";

const labels: Partial<Record<ElectionStatus, { label: string; description: string; icon: typeof Lock }>> = {
  CANDIDATURES: {
    label: "Passer en candidatures",
    description: "La liste des candidats sera figée côté public, mais tu pourras encore la modifier.",
    icon: Megaphone,
  },
  BROUILLON: {
    label: "Revenir au brouillon",
    description: "L’élection ne sera plus visible publiquement.",
    icon: RotateCcw,
  },
  OUVERTE: {
    label: "Ouvrir le vote",
    description:
      "Les étudiants approuvés pourront voter pendant la fenêtre définie. Vérifie les candidats et les horaires avant de confirmer.",
    icon: LockOpen,
  },
  CLOTUREE: {
    label: "Clôturer le vote",
    description:
      "Aucun vote ne sera plus accepté. Les résultats par candidat deviennent visibles dans l’administration, mais pas encore publiquement.",
    icon: Lock,
  },
  PUBLIEE: {
    label: "Publier les résultats",
    description:
      "Les résultats seront visibles par tous sur la page publique. Cette action est définitive.",
    icon: Trophy,
  },
};

export function ElectionStatusActions({
  electionId,
  statut,
}: {
  electionId: string;
  statut: ElectionStatus;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<ElectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transitions = ALLOWED_TRANSITIONS[statut] ?? [];

  async function confirm() {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/elections/${electionId}/status`, {
        method: "POST",
        body: JSON.stringify({ statut: target }),
      });
      setTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (transitions.length === 0) {
    return (
      <p className="text-xs text-ink-500">
        Les résultats sont publiés. Aucune autre action n’est possible.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((next) => {
        const config = labels[next];
        if (!config) return null;
        const Icon = config.icon;
        const prominent = next === "OUVERTE" || next === "PUBLIEE";
        return (
          <Button
            key={next}
            size="sm"
            variant={prominent ? "primary" : "outline"}
            onClick={() => {
              setError(null);
              setTarget(next);
            }}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {config.label}
          </Button>
        );
      })}

      <Modal
        open={target !== null}
        onClose={() => (loading ? null : setTarget(null))}
        title={target ? labels[target]?.label ?? "Confirmer" : "Confirmer"}
        description={target ? labels[target]?.description : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={loading}>
              Annuler
            </Button>
            <Button
              variant={target === "CLOTUREE" || target === "PUBLIEE" ? "danger" : "primary"}
              onClick={confirm}
              loading={loading}
            >
              Confirmer
            </Button>
          </>
        }
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
        {target === "OUVERTE" ? (
          <Alert variant="warning" title="Vérifications obligatoires">
            Au moins deux candidats, une fenêtre valide contenant l’heure actuelle, et aucune
            autre élection ouverte.
          </Alert>
        ) : null}
        {target === "PUBLIEE" ? (
          <Alert variant="warning" title="Publication définitive">
            Les résultats seront visibles publiquement et ne pourront plus être masqués.
          </Alert>
        ) : null}
      </Modal>
    </div>
  );
}
