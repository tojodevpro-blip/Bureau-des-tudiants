"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, KeyRound, LogOut, Save, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

type Props = {
  email: string | null;
  telephone: string | null;
  role: string;
  student: {
    prenoms: string;
    nom: string;
    classe: string;
    matricule: string;
  } | null;
  photoUrl: string | null;
  notificationsEmail: boolean;
  consentementPhotos: boolean;
};

export function ProfileForm(props: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState({
    prenoms: props.student?.prenoms ?? "",
    nom: props.student?.nom ?? "",
    classe: props.student?.classe ?? "",
    photoUrl: props.photoUrl ?? "",
    notificationsEmail: props.notificationsEmail,
    consentementPhotos: props.consentementPhotos,
  });
  const [passwords, setPasswords] = useState({ actuel: "", nouveau: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const isStudent = props.role === "STUDENT";

  function update<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setLoading("profile");
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          prenoms: profile.prenoms || props.student?.prenoms || "Membre",
          nom: profile.nom || props.student?.nom || "BDE",
          classe: profile.classe || props.student?.classe || "BDE",
          photoUrl: profile.photoUrl || null,
          notificationsEmail: profile.notificationsEmail,
          consentementPhotos: profile.consentementPhotos,
        }),
      });
      setMessage("Profil mis à jour.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible d’enregistrer le profil.");
    } finally {
      setLoading(null);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setLoading("password");
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/profile/password", {
        method: "POST",
        body: JSON.stringify({
          motDePasseActuel: passwords.actuel,
          nouveauMotDePasse: passwords.nouveau,
        }),
      });
      setPasswords({ actuel: "", nouveau: "" });
      setMessage("Mot de passe modifié. Les autres sessions ont été déconnectées.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de modifier le mot de passe.");
    } finally {
      setLoading(null);
    }
  }

  async function logoutAll() {
    setLoading("logout");
    setError(null);
    try {
      await apiFetch("/api/profile/logout-all", { method: "POST" });
      router.push("/connexion");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de déconnecter les sessions.");
      setLoading(null);
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    setLoading("delete");
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/profile/delete", {
        method: "POST",
        body: JSON.stringify({ motDePasse: deletePassword, confirmation: deleteConfirmation }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Impossible de supprimer le compte.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-5">
      {message ? <Alert variant="success" title="C’est enregistré">{message}</Alert> : null}
      {error ? <Alert variant="error" title="Action impossible">{error}</Alert> : null}

      {isStudent ? (
        <Card>
          <CardHeader>
            <CardTitle>Mes informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-xs text-ink-500">Prénoms et nom</p>
                <p className="mt-0.5 font-semibold text-ink-900">
                  {props.student ? `${props.student.prenoms} ${props.student.nom}` : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-xs text-ink-500">Classe</p>
                <p className="mt-0.5 font-semibold text-ink-900">{props.student?.classe ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-xs text-ink-500">Matricule</p>
                <p className="mt-0.5 font-mono font-semibold text-ink-900">
                  {props.student?.matricule ?? "—"}
                </p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="text-xs text-ink-500">Identifiant de connexion</p>
                <p className="mt-0.5 truncate font-semibold text-ink-900">
                  {props.email ?? props.telephone ?? "—"}
                </p>
              </div>
            </div>
            <p className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm leading-relaxed text-brand-900">
              Ton identité et ta classe sont vérifiées par le BDE et ne peuvent pas être modifiées
              depuis ton compte. Contacte l’équipe si une information est incorrecte. Tu peux
              changer ton mot de passe ci-dessous.
            </p>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénoms" htmlFor="prenoms">
                <Input
                  id="prenoms"
                  value={profile.prenoms}
                  onChange={(event) => update("prenoms", event.target.value)}
                  disabled={!props.student}
                  required={Boolean(props.student)}
                />
              </Field>
              <Field label="Nom" htmlFor="nom">
                <Input
                  id="nom"
                  value={profile.nom}
                  onChange={(event) => update("nom", event.target.value)}
                  disabled={!props.student}
                  required={Boolean(props.student)}
                />
              </Field>
              <Field label="Classe" htmlFor="classe">
                <Input
                  id="classe"
                  value={profile.classe}
                  onChange={(event) => update("classe", event.target.value)}
                  disabled={!props.student}
                  required={Boolean(props.student)}
                />
              </Field>
              <Field label="Photo (URL https)" htmlFor="photoUrl">
                <Input
                  id="photoUrl"
                  value={profile.photoUrl}
                  onChange={(event) => update("photoUrl", event.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              </Field>
            </div>

            {props.student ? (
              <p className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
                Matricule : <span className="font-mono font-semibold text-ink-800">{props.student.matricule}</span>.
                Ces informations servent à vérifier ton éligibilité. Signale toute erreur au BDE.
              </p>
            ) : null}

            <div className="space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-semibold text-ink-900">Notifications</p>
              <label className="flex items-start gap-3 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-ink-300"
                  checked={profile.notificationsEmail}
                  onChange={(event) => update("notificationsEmail", event.target.checked)}
                />
                Recevoir aussi les notifications importantes par e-mail.
              </label>
              <label className="flex items-start gap-3 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-ink-300"
                  checked={profile.consentementPhotos}
                  onChange={(event) => update("consentementPhotos", event.target.checked)}
                />
                J’accepte d’être identifié(e) sur les photos du BDE.
              </label>
            </div>

            <Button type="submit" loading={loading === "profile"}>
              <Save className="h-4 w-4" aria-hidden />
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>
      )}

      <Card id="securite">
        <CardHeader>
          <CardTitle>Mot de passe et sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mot de passe actuel" htmlFor="current-password">
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.actuel}
                  onChange={(event) => setPasswords((current) => ({ ...current, actuel: event.target.value }))}
                  required
                />
              </Field>
              <Field label="Nouveau mot de passe" htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.nouveau}
                  onChange={(event) => setPasswords((current) => ({ ...current, nouveau: event.target.value }))}
                  minLength={8}
                  required
                />
              </Field>
            </div>
            <Button type="submit" variant="outline" loading={loading === "password"}>
              <KeyRound className="h-4 w-4" aria-hidden />
              Changer le mot de passe
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
            <Button variant="outline" onClick={logoutAll} loading={loading === "logout"}>
              <LogOut className="h-4 w-4" aria-hidden />
              Déconnecter toutes les sessions
            </Button>
            <Link href="/api/profile/export" className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
              <Download className="h-4 w-4" aria-hidden />
              Exporter mes données
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-800">Supprimer mon compte</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-relaxed text-ink-600">
            Ton compte sera anonymisé : email, téléphone et photo effacés, matricule libéré.
            Les résultats de vote déjà enregistrés restent intacts et anonymes, conformément
            à l’intégrité du scrutin.
          </p>
          <form onSubmit={deleteAccount} className="space-y-4">
            <Field label="Mot de passe" htmlFor="delete-password">
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="Tape SUPPRIMER pour confirmer" htmlFor="delete-confirmation">
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                required
              />
            </Field>
            <Button type="submit" variant="danger" loading={loading === "delete"}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Anonymiser mon compte
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
