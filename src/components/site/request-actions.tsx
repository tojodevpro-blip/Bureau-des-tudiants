"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, UserCheck } from "lucide-react";
import type { RequestStatus } from "@prisma/client";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { REQUEST_STATUS_LABELS } from "@/lib/request-status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export function RequestActions({
  requestId,
  statut,
  isStaff,
  canReopen,
  canAssign,
}: {
  requestId: string;
  statut: RequestStatus;
  isStaff: boolean;
  canReopen: boolean;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: RequestStatus) {
    setLoading(next);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statut: next }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de modifier le statut.");
    } finally {
      setLoading(null);
    }
  }

  async function assign() {
    setLoading("assign");
    setError(null);
    try {
      await apiFetch(`/api/admin/requests/${requestId}/assign`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de t’assigner la demande.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-2">
        {isStaff ? (
          <>
            <Select
              value={statut}
              onChange={(event) => setStatus(event.target.value as RequestStatus)}
              disabled={Boolean(loading)}
              aria-label="Statut de la demande"
              className="w-auto"
            >
              {(Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]).map((key) => (
                <option key={key} value={key}>{REQUEST_STATUS_LABELS[key]}</option>
              ))}
            </Select>
            {canAssign ? (
              <Button variant="outline" size="sm" onClick={assign} loading={loading === "assign"}>
                <UserCheck className="h-4 w-4" aria-hidden />
                M’assigner
              </Button>
            ) : null}
          </>
        ) : canReopen ? (
          <Button variant="outline" size="sm" onClick={() => setStatus("OUVERTE")} loading={loading === "OUVERTE"}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Rouvrir la demande
          </Button>
        ) : null}
      </div>
    </div>
  );
}
