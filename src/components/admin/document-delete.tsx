"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

export function DocumentDelete({ id, titre }: { id: string; titre: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`Supprimer définitivement « ${titre} » ?`)) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/documents/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Suppression impossible.");
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      {error ? <p className="mb-1 text-xs text-red-700">{error}</p> : null}
      <Button variant="danger" size="sm" onClick={remove} loading={loading}>
        <Trash2 className="h-4 w-4" aria-hidden />
        Supprimer
      </Button>
    </div>
  );
}
