"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { toLocalDateTimeInput } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";

export function PollForm({ availableClasses }: { availableClasses: string[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [anonyme, setAnonyme] = useState(true);
  const [resultatsMode, setResultatsMode] = useState<"IMMEDIAT" | "APRES_CLOTURE">("APRES_CLOTURE");
  const [closesAt, setClosesAt] = useState("");
  const [audienceToutes, setAudienceToutes] = useState(true);
  const [classesText, setClassesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((item, i) => (i === index ? value : item)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const classes = audienceToutes
        ? []
        : classesText.split(",").map((item) => item.trim()).filter(Boolean);
      const result = await apiFetch<{ id: string }>("/api/admin/polls", {
        method: "POST",
        body: JSON.stringify({
          question,
          description: description || null,
          multiple,
          anonyme,
          resultatsMode,
          closesAt: closesAt || null,
          audienceToutes,
          classes,
          options,
        }),
      });
      router.push(`/admin/sondages/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de créer le sondage.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <Alert variant="error" title="Création impossible">{error}</Alert> : null}
      <Card>
        <CardHeader><CardTitle>Question</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Question" htmlFor="question">
            <Input id="question" value={question} onChange={(event) => setQuestion(event.target.value)} minLength={5} maxLength={240} required />
          </Field>
          <Field label="Description (facultatif)" htmlFor="description">
            <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} />
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-800">Options</p>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={160}
                  aria-label={`Option ${index + 1}`}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}
                  disabled={options.length <= 2}
                  aria-label="Supprimer l’option"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions((current) => [...current, ""])} disabled={options.length >= 12}>
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter une option
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clôture automatique (facultatif)" htmlFor="closesAt">
              <Input id="closesAt" type="datetime-local" value={toLocalDateTimeInput(closesAt || null)} onChange={(event) => setClosesAt(event.target.value)} />
            </Field>
            <Field label="Résultats" htmlFor="resultatsMode">
              <select id="resultatsMode" value={resultatsMode} onChange={(event) => setResultatsMode(event.target.value as "IMMEDIAT" | "APRES_CLOTURE")} className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm">
                <option value="APRES_CLOTURE">Après clôture</option>
                <option value="IMMEDIAT">Immédiatement après avoir voté</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-700">
            <input type="checkbox" checked={multiple} onChange={(event) => setMultiple(event.target.checked)} className="h-4 w-4 rounded border-ink-300" />
            Autoriser plusieurs choix
          </label>
          <label className="flex items-center gap-3 text-sm text-ink-700">
            <input type="checkbox" checked={anonyme} onChange={(event) => setAnonyme(event.target.checked)} className="h-4 w-4 rounded border-ink-300" />
            Sondage anonyme (recommandé : les choix restent séparés de l’identité)
          </label>
          <label className="flex items-center gap-3 text-sm text-ink-700">
            <input type="checkbox" checked={audienceToutes} onChange={(event) => setAudienceToutes(event.target.checked)} className="h-4 w-4 rounded border-ink-300" />
            Toutes les classes
          </label>
          {!audienceToutes ? (
            <Field label="Classes concernées (séparées par des virgules)" htmlFor="classes">
              <Input id="classes" value={classesText} onChange={(event) => setClassesText(event.target.value)} placeholder={availableClasses.slice(0, 4).join(", ")} />
            </Field>
          ) : null}
          <div className="border-t border-ink-100 pt-4">
            <Button type="submit" loading={loading} disabled={options.filter((option) => option.trim()).length < 2}>
              <Save className="h-4 w-4" aria-hidden />
              Créer le brouillon
            </Button>
            <p className="mt-2 text-xs text-ink-400">Le sondage sera créé en brouillon. Ouvre-le depuis sa fiche pour notifier les étudiants.</p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
