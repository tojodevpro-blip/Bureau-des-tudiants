import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/guard";
import { getBranding } from "@/lib/branding";
import { IdentitySettings } from "@/components/admin/identity-settings";

export const metadata: Metadata = { title: "Identité visuelle" };
export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  await requireAdminPage();
  const branding = await getBranding();

  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Réglages</p>
        <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          Identité visuelle
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Personnalise le nom, le slogan et le logo de l’association. Ces informations remplacent
          le logo générique dans toute la plateforme.
        </p>
      </div>
      <IdentitySettings
        name={branding.name}
        shortName={branding.shortName}
        tagline={branding.tagline}
        logoUrl={branding.logoUrl}
        managedLogo={Boolean(branding.logoKey)}
      />
    </div>
  );
}
