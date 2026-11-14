"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Save, Send } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { toLocalDateTimeInput } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

type Announcement = {
  id?: string;
  titre: string;
  contenu: string;
  categorie: string;
  imageUrl: string | null;
  cibleToutes: boolean;
  classes: string[];
  epingle: boolean;
  urgent: boolean;
  publieLe: string | null;
  expireLe: string | null;
  statut: "BROUILLON" | "PUBLIEE" | "ARCHIVEE";
};

const empty: Announcement = {
  titre: "",
  contenu: "",
  categorie: "Vie du BDE",
  imageUrl: null,
  cibleToutes: true,
  classes: [],
  epingle: false,
  urgent: false,
  publieLe: null,
  expireLe: null,
  statut: "BROUILLON",
};

export function AnnouncementForm({
  initial,
  availableClasses,
}: {
  initial?: Announcement;
  availableClasses: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Announcement>(() => initial ?? empty);
  const [classesText, setClassesText] = useState((initial?.classes ?? []).join(", "));
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Announcement>(key: K, value: Announcement[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(statut: Announcement["statut"]) {
    setLoading(statut);
    setError(null);
    try {
      const classes = form.cibleToutes
        ? []
        : classesText.split(",").map((item) => item.trim()).filter(Boolean);
      const payload = {
        ...form,
        statut,
        classes,
        publieLe: form.publieLe ? form.publieLe : null,
        expireLe: form.expireLe ? form.expireLe : null,
      };
      if (initial?.id) {
        await apiFetch(`/api/admin/announcements/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/announcements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      router.push("/admin/annonces");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’enregistrer l’annonce.");
    } finally {
      setLoading(null);
    }
  }

  async function archive() {
    if (!initial?.id) return;
    setLoading("ARCHIVEE");
    setError(null);
    try {
      await apiFetch(`/api/admin/announcements/${initial.id}`, { method: "DELETE" });
      router.push("/admin/annonces");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’archiver l’annonce.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      {error ? <Alert variant="error" title="Action impossible">{error}</Alert> : null}
      <Card>
        <CardHeader>
          <CardTitle>Contenu de l’annonce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre" htmlFor="titre">
              <Input
                id="titre"
                value={form.titre}
                onChange={(event) => update("titre", event.target.value)}
                maxLength={180}
                required
              />
            </Field>
            <Field label="Catégorie" htmlFor="categorie">
              <Input
                id="categorie"
                value={form.categorie}
                onChange={(event) => update("categorie", event.target.value)}
                maxLength={60}
                list="announcement-categories"
                required
              />
              <datalist id="announcement-categories">
                {["Vie du BDE", "Urgent", "Événement", "Académique", "Association", "Information"].map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Contenu (Markdown simple accepté)" htmlFor="contenu">
            <textarea
              id="contenu"
              value={form.contenu}
              onChange={(event) => update("contenu", event.target.value)}
              rows={12}
              maxLength={20000}
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-mono text-sm text-ink-900 shadow-sm"
              placeholder="**Important** : ...&#10;&#10;- point 1&#10;- point 2"
              required
            />
          </Field>
          <p className="text-xs text-ink-400">
            Le contenu est converti en HTML puis assaini côté serveur. Les images intégrées ne sont
            pas autorisées : utilise le champ image ci-dessous.
          </p>

          <Field label="Image d’illustration (URL https, facultatif)" htmlFor="imageUrl">
            <Input
              id="imageUrl"
              value={form.imageUrl ?? ""}
              onChange={(event) => update("imageUrl", event.target.value || null)}
              inputMode="url"
              placeholder="https://…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Publication programmée" htmlFor="publieLe">
              <Input
                id="publieLe"
                type="datetime-local"
                value={toLocalDateTimeInput(form.publieLe)}
                onChange={(event) => update("publieLe", event.target.value || null)}
              />
            </Field>
            <Field label="Expiration (facultatif)" htmlFor="expireLe">
              <Input
                id="expireLe"
                type="datetime-local"
                value={toLocalDateTimeInput(form.expireLe)}
                onChange={(event) => update("expireLe", event.target.value || null)}
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-ink-100 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-ink-800">
              <input
                type="checkbox"
                checked={form.epingle}
                onChange={(event) => update("epingle", event.target.checked)}
                className="h-4 w-4 rounded border-ink-300"
              />
              Épingler en haut du fil
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-ink-800">
              <input
                type="checkbox"
                checked={form.urgent}
                onChange={(event) => update("urgent", event.target.checked)}
                className="h-4 w-4 rounded border-ink-300"
              />
              Marquer comme urgent
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-ink-800">
              <input
                type="checkbox"
                checked={form.cibleToutes}
                onChange={(event) => update("cibleToutes", event.target.checked)}
                className="h-4 w-4 rounded border-ink-300"
              />
              Tous les étudiants
            </label>
            {!form.cibleToutes ? (
              <div>
                <Field label="Classes ciblées (séparées par des virgules)" htmlFor="classes">
                  <Input
                    id="classes"
                    value={classesText}
                    onChange={(event) => setClassesText(event.target.value)}
                    placeholder={availableClasses.slice(0, 5).join(", ")}
                  />
                </Field>
                <p className="mt-1 text-xs text-ink-400">
                  Classes disponibles : {availableClasses.join(", ") || "aucune"}.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <Button onClick={() => save("BROUILLON")} variant="outline" loading={loading === "BROUILLON"}>
              <Save className="h-4 w-4" aria-hidden />
              Enregistrer en brouillon
            </Button>
            <Button onClick={() => save("PUBLIEE")} loading={loading === "PUBLIEE"}>
              <Send className="h-4 w-4" aria-hidden />
              Publier maintenant
            </Button>
            {initial?.id && initial.statut !== "ARCHIVEE" ? (
              <Button onClick={archive} variant="danger" loading={loading === "ARCHIVEE"}>
                <Archive className="h-4 w-4" aria-hidden />
                Archiver
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
