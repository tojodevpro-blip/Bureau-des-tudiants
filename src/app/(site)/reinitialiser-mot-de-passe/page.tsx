import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="container-page flex min-h-[70dvh] items-center py-10">
      <Card className="mx-auto w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <p className="label-caps">Sécurité</p>
          <h1 className="mt-1 text-2xl font-bold text-ink-950">Nouveau mot de passe</h1>
          <p className="mb-6 mt-2 text-sm text-ink-500">
            Choisis un mot de passe d’au moins 8 caractères, différent de l’ancien.
          </p>
          <ResetPasswordForm token={token ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
