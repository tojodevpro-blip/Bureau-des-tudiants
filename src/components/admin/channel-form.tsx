"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

export function ChannelForm({ availableClasses }: { availableClasses: string[] }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [type, setType] = useState<"GENERAL" | "CLASSE" | "ADMIN" | "ANNONCES">("CLASSE");
  const [classe, setClasse] = useState(availableClasses[0] ?? "");
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiFetch("/api/admin/channels", {
        method: "POST",
        body: JSON.stringify({ nom, type, classe: type === "CLASSE" ? classe : null, readOnly }),
      });
      setNom("");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de créer le canal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">Canal créé.</Alert> : null}
      <Field label="Nom du canal" htmlFor="channel-nom">
        <Input id="channel-nom" value={nom} onChange={(event) => setNom(event.target.value)} required minLength={2} maxLength={80} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type" htmlFor="channel-type">
          <Select id="channel-type" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
            <option value="CLASSE">Classe</option>
            <option value="GENERAL">Général</option>
            <option value="ADMIN">Équipe BDE</option>
            <option value="ANNONCES">Annonces</option>
          </Select>
        </Field>
        {type === "CLASSE" ? (
          <Field label="Classe" htmlFor="channel-classe">
            <Select id="channel-classe" value={classe} onChange={(event) => setClasse(event.target.value)} required>
              {availableClasses.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </Field>
        ) : <div />}
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} className="h-4 w-4 rounded border-ink-300" />
        Étudiants en lecture seule
      </label>
      <Button type="submit" loading={loading} disabled={!nom.trim() || (type === "CLASSE" && !classe)}>
        <PlusCircle className="h-4 w-4" aria-hidden />
        Créer le canal
      </Button>
    </form>
  );
}
