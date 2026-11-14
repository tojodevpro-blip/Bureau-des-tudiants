import Link from "next/link";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getEnabledModules } from "@/lib/modules";
import { unreadNotificationCount } from "@/server/services/notifications";
import type { Branding } from "@/lib/branding";
import { BrandMark } from "@/components/brand-mark";
import { HeaderNav } from "@/components/site/header-nav";

export async function SiteHeader({ branding }: { branding: Branding }) {
  const user = await getCurrentUser();
  const [modules, unread] = await Promise.all([
    getEnabledModules(),
    user ? unreadNotificationCount(user.id) : Promise.resolve(0),
  ]);

  const navUser = user
    ? {
        role: user.role,
        prenom: user.student?.prenoms?.split(" ")[0] ?? null,
        email: user.email,
      }
    : null;

  return (
    <HeaderNav
      user={navUser}
      modules={[...modules]}
      initialUnread={unread}
      branding={branding}
    />
  );
}

export function SiteFooter({ branding }: { branding: Branding }) {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-2">
          <div className="flex items-center gap-2">
            <BrandMark shortName={branding.shortName} logoUrl={branding.logoUrl} size="sm" />
            <span className="text-sm font-bold text-ink-950">{branding.name}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-500">
            {branding.tagline}. Retrouve les annonces, le programme, les demandes, les archives
            et les espaces de discussion de la communauté étudiante.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-ink-500">
          <Link className="link-quiet" href="/annonces">Annonces</Link>
          <Link className="link-quiet" href="/programme">Programme</Link>
          <Link className="link-quiet" href="/demandes">Demandes et FAQ</Link>
          <Link className="link-quiet" href="/archives">Archives</Link>
          <Link className="link-quiet" href="/confidentialite">Confidentialité</Link>
          <Link className="link-quiet" href="/conditions">Conditions d’usage</Link>
          <Link className="link-quiet" href="/mentions-legales">Mentions légales</Link>
          <Link className="link-quiet" href="/statut">État du service</Link>
          <span className="flex items-center gap-1.5 text-xs text-ink-400">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Données protégées
          </span>
        </div>
      </div>
      <div className="border-t border-ink-100 py-4 text-center text-xs text-ink-400">
        <div className="container-page flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-3">
          <span>© {new Date().getFullYear()} {branding.name}. Tous droits réservés.</span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <span>
            Conçu par{" "}
            <span className="font-semibold text-ink-600">Tojo Nambinina RANDRIAMIFALY</span>
          </span>
          <span className="hidden sm:inline" aria-hidden>·</span>
          <a
            href="https://wa.me/261387729958"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            WhatsApp 038 77 299 58
          </a>
        </div>
      </div>
    </footer>
  );
}
