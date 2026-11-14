"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function LoginForm() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPending(false);
    try {
      const data = await apiFetch<{ role: "STUDENT" | "ADMIN" }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifiant, motDePasse }),
      });
      router.push(data.role === "STUDENT" ? "/tableau-de-bord" : "/admin");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setPending(err.code === "COMPTE_EN_ATTENTE");
      } else {
        setError("Une erreur est survenue. Réessaie.");
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? (
        <Alert variant={pending ? "warning" : "error"} title={pending ? "Compte en attente" : "Connexion refusée"}>
          {error}
        </Alert>
      ) : null}

      <Field label="Email ou téléphone" htmlFor="identifiant">
        <Input
          id="identifiant"
          name="identifiant"
          type="text"
          autoComplete="username"
          inputMode="email"
          placeholder="ex. etudiant@univ.mg ou 034 12 345 67"
          value={identifiant}
          onChange={(event) => setIdentifiant(event.target.value)}
          required
        />
      </Field>

      <Field label="Mot de passe" htmlFor="motDePasse">
        <div className="relative">
          <Input
            id="motDePasse"
            name="motDePasse"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Ton mot de passe"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            required
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1 top-1 rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" className="w-full" loading={loading}>
        <LogIn className="h-4 w-4" aria-hidden />
        Se connecter
      </Button>
    </form>
  );
}
