"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Save, Trash2, Upload } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { BrandMark } from "@/components/brand-mark";

export function IdentitySettings({
  name,
  shortName,
  tagline,
  logoUrl,
  managedLogo,
}: {
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  managedLogo: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nom: name,
    nomCourt: shortName,
    slogan: tagline,
    logoUrl: managedLogo ? "" : logoUrl,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [existingLogo, setExistingLogo] = useState(logoUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setError("Le logo ne doit pas dépasser 8 Mo.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(next.type)) {
      setError("Choisis une image JPEG, PNG, WebP ou GIF.");
      return;
    }
    setError(null);
    setRemoveLogo(false);
    setFile(next);
  }

  function clearLogo() {
    setFile(null);
    setPreview(null);
    setExistingLogo("");
    setRemoveLogo(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("nom", form.nom);
      body.append("nomCourt", form.nomCourt);
      body.append("slogan", form.slogan);
      body.append("logoUrl", form.logoUrl);
      if (removeLogo) body.append("removeLogo", "true");
      if (file) body.append("logo", file);

      const updated = await apiFetch<{
        name: string;
        shortName: string;
        tagline: string;
        logoUrl: string;
      }>("/api/admin/identity", { method: "POST", body });
      setForm({
        nom: updated.name,
        nomCourt: updated.shortName,
        slogan: updated.tagline,
        logoUrl: updated.logoUrl.startsWith("/api/branding/logo") ? "" : updated.logoUrl,
      });
      setExistingLogo(updated.logoUrl);
      setMessage("Identité visuelle mise à jour. La navigation et les pages publiques sont actualisées.");
      setRemoveLogo(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’enregistrer l’identité visuelle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {message ? <Alert variant="success" title="Identité enregistrée">{message}</Alert> : null}
      {error ? <Alert variant="error" title="Action impossible">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <BrandMark
              shortName={form.nomCourt}
              logoUrl={preview ?? (removeLogo ? "" : existingLogo)}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-ink-950">{form.nom || "Nom de l’association"}</p>
              <p className="text-sm text-ink-500">{form.slogan || "Slogan de la communauté"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identité de l’association</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="Nom complet" htmlFor="identity-name">
              <Input
                id="identity-name"
                value={form.nom}
                onChange={(event) => setForm((current) => ({ ...current, nom: event.target.value }))}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Nom court" htmlFor="identity-short" hint="Utilisé dans les petits espaces et le logo par défaut.">
              <Input
                id="identity-short"
                value={form.nomCourt}
                onChange={(event) => setForm((current) => ({ ...current, nomCourt: event.target.value }))}
                maxLength={16}
                required
              />
            </Field>
          </div>
          <Field label="Slogan" htmlFor="identity-tagline">
            <Input
              id="identity-tagline"
              value={form.slogan}
              onChange={(event) => setForm((current) => ({ ...current, slogan: event.target.value }))}
              maxLength={140}
            />
          </Field>

          <div className="space-y-3 rounded-xl border border-ink-100 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ImageIcon className="h-4 w-4 text-brand-700" aria-hidden />
              Logo
            </p>
            <p className="text-xs leading-relaxed text-ink-500">
              Format carré recommandé, JPEG, PNG, WebP ou GIF, 8 Mo maximum. Le fichier est optimisé
              automatiquement et affiché dans l’espace étudiant comme dans l’administration.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" aria-hidden />
                Choisir une image
              </Button>
              {preview || existingLogo ? (
                <Button type="button" variant="ghost" onClick={clearLogo}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Retirer le logo
                </Button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            <div className="max-w-lg">
              <Field
                label="Ou utiliser une URL d’image"
                htmlFor="identity-logo-url"
                hint="Laisse vide si tu utilises un fichier téléversé."
              >
                <Input
                  id="identity-logo-url"
                  value={form.logoUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, logoUrl: event.target.value }))
                  }
                  placeholder="https://…"
                  inputMode="url"
                />
              </Field>
            </div>
          </div>

          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4" aria-hidden />
            Enregistrer l’identité
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
