"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BellRing,
  CalendarDays,
  Flag,
  Home,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  UserRound,
  Vote,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/site/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Role = "STUDENT" | "MEMBRE_BDE" | "ADMIN";

type NavUser = {
  role: Role;
  prenom: string | null;
  email: string | null;
} | null;

type ModuleKey =
  | "annonces"
  | "demandes"
  | "programme"
  | "archives"
  | "communication"
  | "sondages"
  | "candidatures";

type Brand = {
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
};

type NavLink = {
  href: string;
  label: string;
  icon: typeof Home;
  module?: ModuleKey;
  studentOnly?: boolean;
  staffOnly?: boolean;
};

const moduleLinks: NavLink[] = [
  { href: "/annonces", label: "Annonces", icon: BellRing, module: "annonces" },
  { href: "/programme", label: "Programme", icon: CalendarDays, module: "programme" },
  { href: "/communication", label: "Discussion", icon: MessageCircle, module: "communication" },
  { href: "/archives", label: "Archives", icon: Images, module: "archives" },
  { href: "/sondages", label: "Sondages", icon: BarChart3, module: "sondages" },
  { href: "/demandes", label: "Mes demandes", icon: MessagesSquare, module: "demandes" },
  {
    href: "/candidature",
    label: "Candidatures",
    icon: Vote,
    module: "candidatures",
    studentOnly: true,
  },
];

export function HeaderNav({
  user,
  modules,
  initialUnread,
  branding,
}: {
  user: NavUser;
  modules: ModuleKey[];
  initialUnread: number;
  branding: Brand;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const enabled = new Set(modules);
  const isStudent = user?.role === "STUDENT";
  const isStaff = user?.role === "ADMIN" || user?.role === "MEMBRE_BDE";

  const links: NavLink[] = [
    { href: "/", label: "Accueil", icon: Home },
    ...(isStudent
      ? [{ href: "/tableau-de-bord", label: "Mon espace", icon: LayoutDashboard }]
      : []),
    ...(isStaff ? [{ href: "/admin", label: "Espace BDE", icon: Flag }] : []),
    ...moduleLinks.filter(
      (link) =>
        enabled.has(link.module!) &&
        (!link.studentOnly || isStudent) &&
        (!link.staffOnly || isStaff),
    ),
  ];

  async function logout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const bottomItems = user
    ? isStudent
      ? [
          { href: "/", label: "Accueil", icon: Home },
          ...(enabled.has("annonces") ? [{ href: "/annonces", label: "Annonces", icon: Bell }] : []),
          ...(enabled.has("programme") ? [{ href: "/programme", label: "Agenda", icon: CalendarDays }] : []),
          ...(enabled.has("communication") ? [{ href: "/communication", label: "Discussion", icon: MessageCircle }] : []),
          { href: "/profil", label: "Profil", icon: UserRound },
        ]
      : [
          { href: "/", label: "Accueil", icon: Home },
          { href: "/admin", label: "Espace BDE", icon: Flag },
          { href: "/notifications", label: "Alertes", icon: Bell },
          { href: "/profil", label: "Profil", icon: UserRound },
        ]
    : [
        { href: "/", label: "Accueil", icon: Home },
        ...(enabled.has("annonces") ? [{ href: "/annonces", label: "Annonces", icon: Bell }] : []),
        ...(enabled.has("programme") ? [{ href: "/programme", label: "Agenda", icon: CalendarDays }] : []),
        { href: "/connexion", label: "Connexion", icon: UserRound },
      ];

  const navigation = (mobile = false) => (
    <nav className={cn("space-y-1", mobile ? "p-3" : "flex-1 overflow-y-auto p-3")} aria-label="Navigation principale">
      {links.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active
                ? "bg-brand-50 text-brand-800"
                : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const accountPanel = (mobile = false) =>
    user ? (
      <div className={cn("space-y-2 border-t border-ink-100 p-4", mobile && "p-3")}>
        <ThemeToggle className="w-full" />
        <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">
              {user.prenom ?? user.email ?? "Mon compte"}
            </p>
            <p className="text-[11px] text-ink-500">
              {user.role === "ADMIN"
                ? "Administrateur"
                : user.role === "MEMBRE_BDE"
                  ? "Membre BDE"
                  : "Étudiant"}
            </p>
          </div>
          <NotificationBell initialUnread={initialUnread} align="left" direction="up" />
        </div>
        <Link
          href="/profil"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Mon profil
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Déconnexion
        </button>
      </div>
    ) : (
      <div className={cn("space-y-2 border-t border-ink-100 p-4", mobile && "p-3")}>
        <ThemeToggle className="w-full" />
        <Link href="/connexion" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          Connexion
        </Link>
        <Link href="/inscription" className={cn(buttonVariants(), "w-full")}>
          Créer mon compte
        </Link>
      </div>
    );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-ink-100 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`Accueil ${branding.name}`}>
            <BrandMark shortName={branding.shortName} logoUrl={branding.logoUrl} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-ink-950">{branding.name}</span>
              <span className="block truncate text-[11px] font-medium text-ink-400">
                {branding.tagline}
              </span>
            </span>
          </Link>
        </div>
        {navigation()}
        {accountPanel()}
      </aside>

      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`Accueil ${branding.name}`}>
            <BrandMark shortName={branding.shortName} logoUrl={branding.logoUrl} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-ink-950">{branding.name}</span>
              <span className="block truncate text-[11px] font-medium text-ink-400">
                {branding.shortName}
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            {user ? <NotificationBell initialUnread={initialUnread} /> : null}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-ink-600 hover:bg-ink-100"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
          />
          <aside
            id="mobile-nav"
            className="relative flex h-full w-80 max-w-[88vw] flex-col bg-white shadow-float"
          >
            <div className="flex h-16 items-center justify-between border-b border-ink-100 px-4">
              <Link href="/" className="flex min-w-0 items-center gap-2.5">
                <BrandMark shortName={branding.shortName} logoUrl={branding.logoUrl} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-bold text-ink-950">{branding.name}</span>
                  <span className="block truncate text-[11px] text-ink-400">{branding.tagline}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {navigation(true)}
              {accountPanel(true)}
            </div>
          </aside>
        </div>
      ) : null}

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden"
        aria-label="Navigation rapide"
      >
        <div className="flex">
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium",
                  active ? "text-brand-700" : "text-ink-500",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
