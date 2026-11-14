"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Flag,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Palette,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  Vote,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/site/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Role = "MEMBRE_BDE" | "ADMIN";

type ModuleKey =
  | "annonces"
  | "demandes"
  | "programme"
  | "archives"
  | "communication"
  | "sondages"
  | "candidatures";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  treasuryOnly?: boolean;
  module?: ModuleKey;
  badge?: number;
};

type Brand = {
  name: string;
  shortName: string;
  logoUrl: string;
};

export function AdminShell({
  children,
  adminEmail,
  role,
  modules,
  pendingCount,
  pendingReports,
  openElection,
  initialUnread,
  branding,
  treasuryAccess,
}: {
  children: ReactNode;
  adminEmail: string | null;
  role: Role;
  modules: ModuleKey[];
  pendingCount: number;
  pendingReports: number;
  openElection: string | null;
  initialUnread: number;
  branding: Brand;
  treasuryAccess: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/connexion");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const enabled = new Set(modules);
  const allNavItems: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/admin/annonces", label: "Annonces", icon: BellRing, module: "annonces" },
    { href: "/admin/demandes", label: "Demandes", icon: MessagesSquare, module: "demandes" },
    { href: "/admin/programme", label: "Programme", icon: CalendarDays, module: "programme" },
    { href: "/admin/tresorerie", label: "Trésorerie", icon: Wallet, treasuryOnly: true },
    { href: "/admin/archives", label: "Photos et documents", icon: Images, module: "archives" },
    { href: "/admin/communication", label: "Communication", icon: MessageCircle, module: "communication" },
    { href: "/admin/sondages", label: "Sondages", icon: BarChart3, module: "sondages" },
    { href: "/admin/signalements", label: "Signalements", icon: Flag, badge: pendingReports },
    { href: "/admin/elections", label: "Élections", icon: Vote, adminOnly: true },
    { href: "/admin/etudiants", label: "Matricules", icon: Users, adminOnly: true },
    { href: "/admin/import", label: "Import CSV / Excel", icon: FileSpreadsheet, adminOnly: true },
    { href: "/admin/utilisateurs", label: "Comptes et rôles", icon: ShieldCheck, adminOnly: true, badge: pendingCount },
    { href: "/admin/audit", label: "Journal d’audit", icon: ScrollText, adminOnly: true },
    { href: "/admin/identite", label: "Identité visuelle", icon: Palette, adminOnly: true },
    { href: "/admin/modules", label: "Modules et maintenance", icon: Settings2, adminOnly: true },
  ];
  const navItems = allNavItems.filter(
    (item) =>
      (!item.adminOnly || role === "ADMIN") &&
      (!item.treasuryOnly || treasuryAccess) &&
      (!item.module || enabled.has(item.module)),
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-ink-100 px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
          <BrandMark shortName={branding.shortName} logoUrl={branding.logoUrl} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-ink-950">{branding.name}</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
              {role === "ADMIN" ? "Administration" : "Espace membre"}
            </p>
          </div>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationBell initialUnread={initialUnread} align="left" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigation de l’espace BDE">
        {navItems.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-ink-100 p-4">
        <ThemeToggle className="w-full" />
        {openElection ? (
          <div className="rounded-xl bg-brand-50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <Vote className="h-3.5 w-3.5" aria-hidden />
              Vote en cours
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-medium text-brand-900">{openElection}</p>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink-700">{adminEmail ?? "Compte BDE"}</p>
            <p className="text-[11px] text-ink-400">
              {role === "ADMIN"
                ? "Administrateur"
                : treasuryAccess
                  ? "Membre BDE · Trésorier"
                  : "Membre BDE"}
            </p>
          </div>
          <Link
            href="/profil"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label="Mon profil"
            title="Mon profil"
          >
            <UserRound className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label="Déconnexion"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <Link href="/" className="link-quiet block text-xs">
          ← Retour au site public
        </Link>
        <Link href="/statut" className="link-quiet block text-xs">
          État du service
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-ink-100 bg-white lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-white shadow-float">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <BrandMark shortName={branding.shortName} logoUrl={branding.logoUrl} size="sm" />
          <span className="min-w-0 truncate text-sm font-bold text-ink-950">{branding.name}</span>
          <div className="ml-auto flex items-center gap-1">
            {pendingReports > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                {pendingReports} signalement(s)
              </span>
            ) : null}
            <NotificationBell initialUnread={initialUnread} />
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
