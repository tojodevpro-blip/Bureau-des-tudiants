"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";

export function UserApprovalActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROUVE" | "REJETE" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(statut: "APPROUVE" | "REJETE") {
    setLoading(statut);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/status`, {
        method: "POST",
        body: JSON.stringify({ statut }),
      });
      setRejectOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        onClick={() => setStatus("APPROUVE")}
        loading={loading === "APPROUVE"}
        disabled={loading !== null}
      >
        <Check className="h-4 w-4" aria-hidden />
        Approuver
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          setRejectOpen(true);
        }}
        disabled={loading !== null}
      >
        <X className="h-4 w-4" aria-hidden />
        Rejeter
      </Button>

      <Modal
        open={rejectOpen}
        onClose={() => (loading ? null : setRejectOpen(false))}
        title="Rejeter ce compte ?"
        description="L’étudiant ne pourra pas se connecter. Le matricule restera associé au compte ; utilise la réinitialisation de réclamation si nécessaire."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading !== null}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => setStatus("REJETE")}
              loading={loading === "REJETE"}
            >
              Rejeter le compte
            </Button>
          </>
        }
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
      </Modal>
    </div>
  );
}
