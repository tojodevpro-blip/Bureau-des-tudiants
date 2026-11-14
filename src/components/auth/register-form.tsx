"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, UserPlus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { normalizeMatricule } from "@/lib/normalize";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    matricule: "",
    nom: "",
    identifiant: "",
    motDePasse: "",
    confirmation: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<"pending" | "connected" | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.motDePasse.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (form.motDePasse !== form.confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    try {
      normalizeMatricule(form.matricule);
    } catch {
      setError("Le matricule n’est pas au bon format. Exemple : CAN31/001.");
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ enAttente: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          matricule: form.matricule,
          nom: form.nom,
          identifiant: form.identifiant,
          motDePasse: form.motDePasse,
        }),
      });
      setSuccess(data.enAttente ? "pending" : "connected");
      if (!data.enAttente) {
        router.push("/tableau-de-bord");
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Réessaie.");
      }
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="Inscription enregistrée">
          {success === "pending"
            ? "Ton compte est en attente de validation par l’administration du BDE. Tu pourras te connecter après approbation."
            : "Ton compte est créé. Tu peux maintenant accéder à ton espace étudiant."}
        </Alert>
        <div className="flex justify-center text-brand-600">
          <CheckCircle2 className="h-12 w-12" aria-hidden />
        </div>
        <Link href="/connexion">
          <Button className="w-full">Aller à la connexion</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="error" title="Inscription impossible">
          {error}
        </Alert>
      ) : null}

      <Field
        label="Matricule"
        htmlFor="matricule"
        hint="Format accepté : CAN31/001, CAN31-1, MPJ18/05…"
      >
        <Input
          id="matricule"
          name="matricule"
          type="text"
          autoComplete="off"
          placeholder="CAN31/001"
          value={form.matricule}
          onChange={(event) => update("matricule", event.target.value)}
          required
        />
      </Field>

      <Field
        label="Nom de famille"
        htmlFor="nom"
        hint="Tel qu’il figure sur la liste du BDE. Ne révèle pas ton nom publiquement."
      >
        <Input
          id="nom"
          name="nom"
          type="text"
          autoComplete="family-name"
          placeholder="Ton nom de famille"
          value={form.nom}
          onChange={(event) => update("nom", event.target.value)}
          required
        />
      </Field>

      <Field
        label="Email ou téléphone"
        htmlFor="identifiant"
        hint="Servira d’identifiant de connexion."
      >
        <Input
          id="identifiant"
          name="identifiant"
          type="text"
          autoComplete="username"
          placeholder="etudiant@univ.mg ou 034 12 345 67"
          value={form.identifiant}
          onChange={(event) => update("identifiant", event.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mot de passe" htmlFor="motDePasse" hint="8 caractères minimum.">
          <div className="relative">
            <Input
              id="motDePasse"
              name="motDePasse"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={form.motDePasse}
              onChange={(event) => update("motDePasse", event.target.value)}
              required
              minLength={8}
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
        <Field label="Confirmation" htmlFor="confirmation">
          <Input
            id="confirmation"
            name="confirmation"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={form.confirmation}
            onChange={(event) => update("confirmation", event.target.value)}
            required
            minLength={8}
          />
        </Field>
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        <UserPlus className="h-4 w-4" aria-hidden />
        Créer mon compte
      </Button>

      <p className="text-center text-xs leading-relaxed text-ink-400">
        En créant un compte, tu confirmes que les informations fournies sont exactes.
      </p>
    </form>
  );
}
