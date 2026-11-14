import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Fingerprint, ShieldCheck, UserCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { isManualApprovalEnabled } from "@/lib/settings";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Inscription" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/tableau-de-bord");
  const manualApproval = await isManualApprovalEnabled();

  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5 lg:sticky lg:top-24">
          <Link href="/" className="link-quiet inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à l’accueil
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-ink-950">
            Crée ton compte étudiant.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-500">
            Ton matricule est vérifié avec ton nom de famille pour empêcher toute usurpation.
            Ces informations ne sont jamais affichées publiquement.
          </p>
          <div className="space-y-3">
            {[
              { icon: Fingerprint, text: "Matricule unique, normalisé automatiquement" },
              { icon: UserCheck, text: "Vérification du nom de famille" },
              { icon: ShieldCheck, text: "Mot de passe haché, jamais stocké en clair" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-sm text-ink-600">
                <item.icon className="h-4 w-4 text-brand-600" aria-hidden />
                {item.text}
              </div>
            ))}
          </div>
          {manualApproval ? (
            <Alert variant="info" title="Validation manuelle activée">
              Après l’inscription, ton compte devra être approuvé par l’administration du BDE
              avant de pouvoir accéder à ton espace étudiant.
            </Alert>
          ) : null}
        </div>

        <Card className="mx-auto w-full max-w-md">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 space-y-1">
              <p className="label-caps">Première connexion</p>
              <h2 className="text-2xl font-bold text-ink-950">Créer mon compte</h2>
              <p className="text-sm text-ink-500">
                Utilise le matricule et le nom de famille figurant sur la liste du BDE.
              </p>
            </div>
            <RegisterForm />
            <p className="mt-6 text-center text-sm text-ink-500">
              Déjà inscrit ?{" "}
              <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
