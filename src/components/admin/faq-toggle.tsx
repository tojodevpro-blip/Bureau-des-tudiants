"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function FaqToggle({ requestId, publiee }: { requestId: string; publiee: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/requests/${requestId}/faq`, {
        method: "PATCH",
        body: JSON.stringify({ publiee: !publiee }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button variant={publiee ? "outline" : "subtle"} size="sm" onClick={toggle} loading={loading}>
        <BookOpenCheck className="h-4 w-4" aria-hidden />
        {publiee ? "Retirer de la FAQ" : "Publier dans la FAQ"}
      </Button>
    </div>
  );
}
