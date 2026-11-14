import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "STUDENT" ? "/tableau-de-bord" : "/admin");

  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="hidden space-y-5 lg:block">
          <Link href="/" className="link-quiet inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour à l’accueil
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-ink-950">
            Content de te revoir.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-500">
            Connecte-toi pour accéder à ton espace personnel, suivre les annonces du BDE
            et gérer tes informations en toute confidentialité.
          </p>
          <div className="space-y-3">
            {[
              { icon: LockKeyhole, text: "Session sécurisée par cookie httpOnly" },
              { icon: ShieldCheck, text: "Protection contre les tentatives répétées" },
              { icon: Mail, text: "Connexion par email ou téléphone" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-sm text-ink-600">
                <item.icon className="h-4 w-4 text-brand-600" aria-hidden />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 space-y-1">
              <p className="label-caps">Espace personnel</p>
              <h2 className="text-2xl font-bold text-ink-950">Se connecter</h2>
              <p className="text-sm text-ink-500">
                Utilise l’email ou le téléphone renseigné lors de ton inscription.
              </p>
            </div>
            <LoginForm />
            <p className="mt-4 text-center text-sm">
              <Link href="/mot-de-passe-oublie" className="font-semibold text-brand-700 hover:underline">
                Mot de passe oublié ?
              </Link>
            </p>
            <p className="mt-6 text-center text-sm text-ink-500">
              Pas encore inscrit ?{" "}
              <Link href="/inscription" className="font-semibold text-brand-700 hover:underline">
                Créer mon compte
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
