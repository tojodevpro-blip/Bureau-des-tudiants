import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page flex min-h-[70dvh] items-center py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <p className="label-caps">Accès au compte</p>
          <h1 className="mt-1 text-2xl font-bold text-ink-950">Mot de passe oublié</h1>
          <p className="mb-6 mt-2 text-sm text-ink-500">
            Indique l’email ou le téléphone de ton compte. Un lien valable une heure sera envoyé
            si un compte correspond.
          </p>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
