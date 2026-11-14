import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarDays,
  Images,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isApprovedStudent } from "@/lib/auth/session";
import { getCurrentElection } from "@/server/services/elections";
import { isVoteWindowOpen } from "@/lib/election-status";
import { getEnabledModules, type ModuleKey } from "@/lib/modules";
import { getBranding } from "@/lib/branding";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const serviceCatalog: {
  key: ModuleKey;
  href: string;
  title: string;
  description: string;
  icon: typeof BellRing;
}[] = [
  {
    key: "annonces",
    href: "/annonces",
    title: "Annonces",
    description: "Les informations officielles et les nouvelles de la communauté.",
    icon: BellRing,
  },
  {
    key: "programme",
    href: "/programme",
    title: "Programme",
    description: "Les événements à venir, les inscriptions et les rappels.",
    icon: CalendarDays,
  },
  {
    key: "demandes",
    href: "/demandes",
    title: "Demandes",
    description: "Pose une question au BDE et suis la réponse directement.",
    icon: MessagesSquare,
  },
  {
    key: "communication",
    href: "/communication",
    title: "Discussion",
    description: "Échange avec les étudiants dans les canaux de la communauté.",
    icon: MessageCircle,
  },
  {
    key: "archives",
    href: "/archives",
    title: "Archives",
    description: "Les photos, les souvenirs et les documents utiles.",
    icon: Images,
  },
  {
    key: "sondages",
    href: "/sondages",
    title: "Sondages",
    description: "Donne ton avis sur la vie étudiante et les projets du BDE.",
    icon: BarChart3,
  },
];

export default async function HomePage() {
  const branding = await getBranding();
  const [user, modules, election] = await Promise.all([
    getCurrentUser(),
    getEnabledModules(),
    getCurrentElection(),
  ]);

  const now = new Date();
  const classe = user?.student?.classe ?? null;
  const [studentCount, announcements, events, openPolls, albumCount] = await Promise.all([
    prisma.student.count({ where: { actif: true } }),
    prisma.announcement.findMany({
      where: {
        statut: "PUBLIEE",
        AND: [
          { OR: [{ publieLe: null }, { publieLe: { lte: now } }] },
          { OR: [{ expireLe: null }, { expireLe: { gt: now } }] },
          { OR: [{ cibleToutes: true }, ...(classe ? [{ classes: { has: classe } }] : [])] },
        ],
      },
      orderBy: [{ epingle: "desc" }, { urgent: "desc" }, { publieLe: "desc" }],
      take: 3,
    }),
    prisma.event.findMany({
      where: { fin: { gte: now }, annuleLe: null },
      orderBy: { debut: "asc" },
      take: 3,
    }),
    prisma.poll.count({ where: { statut: "OUVERT" } }),
    prisma.album.count(),
  ]);

  const openElection = election && isVoteWindowOpen(election);
  const primaryHref =
    user?.role === "ADMIN" || user?.role === "MEMBRE_BDE"
      ? "/admin"
      : isApprovedStudent(user)
        ? "/tableau-de-bord"
        : "/inscription";
  const primaryLabel =
    user?.role === "ADMIN" || user?.role === "MEMBRE_BDE"
      ? "Ouvrir l’espace BDE"
      : isApprovedStudent(user)
        ? "Accéder à mon espace"
        : "Rejoindre la communauté";

  const services = serviceCatalog.filter((service) => modules.has(service.key));

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-100 bg-gradient-to-b from-white via-brand-50/60 to-ink-50">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-accent-200/30 blur-3xl"
        />
        <div className="container-page relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">Plateforme officielle · {branding.shortName}</Badge>
              <Badge variant="neutral">{studentCount} étudiants dans la communauté</Badge>
            </div>

            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-ink-950 sm:text-5xl lg:text-[3.4rem]">
              La vie étudiante,
              <span className="block text-brand-700">au même endroit.</span>
            </h1>

            <p className="max-w-xl text-pretty text-base leading-relaxed text-ink-600 sm:text-lg">
              {branding.name} rassemble les annonces, le programme, les demandes et les échanges
              de la communauté. Un espace clair, utile et pensé pour les étudiants.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!user ? (
                <Link
                  href="/connexion"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Se connecter
                </Link>
              ) : null}
              {modules.has("annonces") ? (
                <Link
                  href="/annonces"
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                >
                  Voir les annonces
                </Link>
              ) : null}
            </div>

            <div className="grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: studentCount, label: "Étudiants" },
                { value: events.length, label: "À venir" },
                { value: openPolls, label: "Sondages ouverts" },
                { value: albumCount, label: "Albums" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-ink-100 bg-white/80 p-3">
                  <p className="text-xl font-black text-ink-950">{stat.value}</p>
                  <p className="text-[11px] font-medium text-ink-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between bg-brand-800 px-5 py-4 text-white sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                  Prochains rendez-vous
                </p>
                <h2 className="mt-1 text-lg font-bold">Le programme de la communauté</h2>
              </div>
              <CalendarDays className="h-6 w-6 text-brand-200" aria-hidden />
            </div>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {events.length > 0 ? (
                events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/programme/${event.id}`}
                    className="flex gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                  >
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                      <span className="text-base font-black leading-none">
                        {event.debut.getDate()}
                      </span>
                      <span className="text-[10px] font-semibold uppercase">
                        {new Intl.DateTimeFormat("fr-FR", {
                          month: "short",
                          timeZone: "Indian/Antananarivo",
                        }).format(event.debut)}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {event.titre}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-500">
                        {event.lieu} · {event.categorie}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl bg-ink-50 p-4">
                  <p className="text-sm font-semibold text-ink-900">Le programme arrive bientôt.</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">
                    Les événements et les activités du BDE seront publiés dans cet espace.
                  </p>
                </div>
              )}
              {modules.has("programme") ? (
                <Link
                  href="/programme"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                >
                  Tout le programme
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      {openElection ? (
        <section className="container-page pt-6">
          <Link
            href={user?.role === "STUDENT" ? "/vote" : "/connexion"}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-float"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Vote className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink-950">
                Un scrutin BDE est en cours
              </span>
              <span className="block truncate text-sm text-ink-500">{election.titre}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              Participer
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        </section>
      ) : null}

      <section className="container-page py-14">
        <div className="mb-8 max-w-2xl space-y-2">
          <p className="label-caps">Les services</p>
          <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            Tout ce dont tu as besoin, sans chercher.
          </h2>
          <p className="text-sm leading-relaxed text-ink-500">
            Les modules de la plateforme sont activés par le BDE selon les besoins de la
            communauté.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link key={service.key} href={service.href} className="surface group p-5 transition hover:border-brand-200 hover:shadow-float">
              <span className="inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-700">
                <service.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 flex items-center gap-2 font-semibold text-ink-950">
                {service.title}
                <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden />
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{service.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="label-caps">Dernières nouvelles</p>
                <h2 className="mt-1 text-xl font-bold text-ink-950">Les annonces du BDE</h2>
              </div>
              <BellRing className="h-6 w-6 text-brand-600" aria-hidden />
            </div>
            <div className="mt-4 space-y-2">
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <Link
                    key={announcement.id}
                    href={`/annonces/${announcement.id}`}
                    className="block rounded-xl border border-ink-100 p-3 transition hover:bg-ink-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-brand-700">
                        {announcement.categorie}
                      </span>
                      {announcement.urgent ? <Badge variant="warning">Urgent</Badge> : null}
                      {announcement.epingle ? <Badge variant="brand">Épinglé</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900">
                      {announcement.titre}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-400">
                      {formatDateTime(announcement.publieLe ?? announcement.createdAt)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
                  Aucune annonce publiée pour le moment.
                </p>
              )}
            </div>
            {modules.has("annonces") ? (
              <Link
                href="/annonces"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
              >
                Toutes les annonces
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>

          <div className="surface flex flex-col justify-between gap-5 bg-ink-950 p-6 text-white">
            <div>
              <Sparkles className="h-7 w-7 text-brand-300" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold">Une communauté qui vit toute l’année.</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">
                Que tu cherches une information, un événement ou un moyen de contacter le BDE,
                tout est réuni ici. Ton compte te donne accès aux services réservés aux étudiants.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={user ? primaryHref : "/inscription"}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Users className="h-4 w-4" aria-hidden />
                {user ? primaryLabel : "Créer mon compte"}
              </Link>
              {modules.has("demandes") ? (
                <Link
                  href="/demandes/nouvelle"
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink-200 hover:bg-white/10"
                >
                  Contacter le BDE
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
