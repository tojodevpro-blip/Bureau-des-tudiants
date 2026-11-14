"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function PhotoTagButton({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tag() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/media/${mediaId}/tag`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de te taguer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={tag}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-700"
      >
        <UserCheck className="h-3.5 w-3.5" aria-hidden />
        {loading ? "…" : "Je suis sur cette photo"}
      </button>
      {error ? <span className="block text-xs text-red-700">{error}</span> : null}
    </span>
  );
}
