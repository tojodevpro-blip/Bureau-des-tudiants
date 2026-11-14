"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function MediaUploader({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        await apiFetch(`/api/admin/albums/${albumId}/media`, { method: "POST", body });
      }
      setFiles([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’ajouter les photos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        aria-label="Choisir des photos"
      />
      <p className="text-xs text-ink-400">JPEG, PNG, WebP ou GIF · 8 Mo maximum par photo. Les images sont redimensionnées et converties en WebP.</p>
      <Button type="submit" loading={loading} disabled={files.length === 0}>
        <ImagePlus className="h-4 w-4" aria-hidden />
        Ajouter {files.length > 0 ? `${files.length} photo(s)` : "des photos"}
      </Button>
    </form>
  );
}
