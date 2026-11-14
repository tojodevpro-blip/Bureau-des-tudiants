"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Wrench } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

type Item = { key: string; label: string; description: string };

export function ModuleSettings({
  catalog,
  enabled,
  maintenance,
  maintenanceMessage,
}: {
  catalog: Item[];
  enabled: string[];
  maintenance: boolean;
  maintenanceMessage: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(enabled);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [maint, setMaint] = useState(maintenance);
  const [maintMessage, setMaintMessage] = useState(maintenanceMessage);

  function toggle(key: string) {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function saveModules() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/modules", {
        method: "POST",
        body: JSON.stringify({ modules: selected }),
      });
      setMessage("Modules enregistrés. La navigation est mise à jour.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’enregistrer les modules.");
    } finally {
      setLoading(false);
    }
  }

  async function saveMaintenance(actif: boolean) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/maintenance", {
        method: "POST",
        body: JSON.stringify({ actif, message: maintMessage }),
      });
      setMaint(actif);
      setMessage(actif ? "Mode maintenance activé." : "Mode maintenance désactivé.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de modifier la maintenance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {message ? <Alert variant="success" title="Enregistré">{message}</Alert> : null}
      {error ? <Alert variant="error" title="Action impossible">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Modules actifs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-500">
            Les modules désactivés disparaissent de la navigation et leurs pages publiques
            redirigent vers la page « modules à venir ». Les administrateurs conservent l’accès
            pour les réactiver.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-100 p-4 transition hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink-300"
                  checked={selected.includes(item.key)}
                  onChange={() => toggle(item.key)}
                />
                <span>
                  <span className="block font-semibold text-ink-900">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                    {item.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <Button onClick={saveModules} loading={loading}>
            <Save className="h-4 w-4" aria-hidden />
            Enregistrer les modules
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" aria-hidden />
            Mode maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-ink-500">
            Les visiteurs voient une page d’information. Les administrateurs et membres BDE
            connectés gardent l’accès pour préparer le retour.
          </p>
          <Field label="Message affiché" htmlFor="maintenance-message">
            <Input
              id="maintenance-message"
              value={maintMessage}
              onChange={(event) => setMaintMessage(event.target.value)}
              maxLength={500}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={maint ? "outline" : "danger"}
              onClick={() => saveMaintenance(!maint)}
              loading={loading}
            >
              {maint ? "Désactiver la maintenance" : "Activer la maintenance"}
            </Button>
            <Button variant="outline" onClick={() => saveMaintenance(false)} disabled={!maint || loading}>
              Rétablir le service
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
