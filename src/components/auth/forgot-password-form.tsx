"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [identifiant, setIdentifiant] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<{ message: string; devToken?: string }>(
        "/api/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ identifiant }) },
      );
      setMessage(data.message);
      setDevToken(data.devToken ?? null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {message ? <Alert variant="info" title="Demande envoyée">{message}</Alert> : null}
      {error ? <Alert variant="error" title="Erreur">{error}</Alert> : null}
      {devToken ? (
        <Alert variant="warning" title="Mode développement">
          Lien de test :{" "}
          <Link className="font-semibold underline" href={`/reinitialiser-mot-de-passe?token=${encodeURIComponent(devToken)}`}>
            réinitialiser le mot de passe
          </Link>
        </Alert>
      ) : null}
      <Field label="Email ou téléphone" htmlFor="identifiant">
        <Input
          id="identifiant"
          value={identifiant}
          onChange={(event) => setIdentifiant(event.target.value)}
          autoComplete="username"
          required
        />
      </Field>
      <Button type="submit" className="w-full" loading={loading}>
        <Mail className="h-4 w-4" aria-hidden />
        Recevoir un lien
      </Button>
      <p className="text-center text-sm">
        <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
