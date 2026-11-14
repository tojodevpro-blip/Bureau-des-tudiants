"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (motDePasse !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, motDePasse }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de réinitialiser le mot de passe.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return <Alert variant="error" title="Lien invalide">Ce lien de réinitialisation est incomplet.</Alert>;
  }

  if (success) {
    return (
      <Alert variant="success" title="Mot de passe modifié">
        Tu peux maintenant <Link href="/connexion" className="font-semibold underline">te connecter</Link> avec ton nouveau mot de passe.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert variant="error" title="Erreur">{error}</Alert> : null}
      <Field label="Nouveau mot de passe" htmlFor="nouveau">
        <Input
          id="nouveau"
          type="password"
          value={motDePasse}
          onChange={(event) => setMotDePasse(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Confirmation" htmlFor="confirmation">
        <Input
          id="confirmation"
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        <KeyRound className="h-4 w-4" aria-hidden />
        Enregistrer
      </Button>
    </form>
  );
}
