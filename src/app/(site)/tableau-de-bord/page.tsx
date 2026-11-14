import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  MessagesSquare,
  ShieldAlert,
  UserRound,
  Vote,
} from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { getCurrentElection } from "@/server/services/elections";
import { getUserVoteStatus } from "@/server/services/voting";
import { isVoteWindowOpen } from "@/lib/election-status";
import { listAnnouncementsForStudent } from "@/server/services/announcements";
import { listEvents } from "@/server/services/events";
import { unreadNotificationCount } from "@/server/services/notifications";
import { getEnabledModules } from "@/lib/modules";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatDateTime, maskIdentifiant } from "@/lib/utils";

export const metadata: Metadata = { title: "Mon espace" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireStudentPage();
  const classe = user.student?.classe ?? null;
  const [election, modules, notifications, announcements, events] = await Promise.all([
    getCurrentElection(),
    getEnabledModules(),
    unreadNotificationCount(user.id),
    listAnnouncementsForStudent(user.id, classe, { page: 1, pageSize: 3 }),
    listEvents(),
  ]);

  const open = election ? isVoteWindowOpen(election) : false;
  const scrutin = election && open ? election : null;
  const vote = scrutin ? await getUserVoteStatus(scrutin.id, user.id) : null;
  const pending = user.statut === "EN_ATTENTE";
  const upcomingEvents = events.items.slice(0, 3);

  const quickLinks = [
    modules.has("annonces") ? { href: "/annonces", label: "Annonces", icon: BellRing } : null,
    modules.has("programme") ? { href: "/programme", label: "Programme", icon: CalendarDays } : null,
    modules.has("communication") ? { href: "/communication", label: "Discussion", icon: MessageCircle } : null,
    modules.has("demandes") ? { href: "/demandes", label: "Mes demandes", icon: MessagesSquare } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-col gap-2">
        <p className="label-caps">Mon espace</p>
        <h1 className="text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
          Bonjour{user.student?.prenoms ? `, ${user.student.prenoms.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-sm text-ink-500">
          Retrouve les nouvelles de la communauté, ton programme et tes services étudiants.
        </p>
      </div>

      {pending ? (
        <Alert variant="warning" title="Compte en attente de validation" className="mt-6">
          Ton inscription a bien été enregistrée. L’administration du BDE doit approuver ton
          compte avant que tu puisses accéder à tous les services.
        </Alert>
      ) : null}

      {!user.student?.actif ? (
        <Alert variant="error" title="Compte désactivé" className="mt-6">
          Ton compte est désactivé. Contacte l’administration du BDE pour régulariser ta
          situation.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Statut du compte"
          value={pending ? "En attente" : "Approuvé"}
          hint={user.student?.classe}
          icon={pending ? <Clock3 className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Matricule"
          value={user.student?.matricule ?? "—"}
          hint={user.student ? `${user.student.prenoms} ${user.student.nom}` : "—"}
          icon={<UserRound className="h-5 w-5" />}
        />
        <StatCard
          label="Notifications"
          value={notifications}
          hint="Non lues"
          icon={<BellRing className="h-5 w-5" />}
        />
        <StatCard
          label="Identifiant"
          value={maskIdentifiant(user.email ?? user.telephone)}
          hint="Email ou téléphone de connexion"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-700" aria-hidden />
              Prochains rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/programme/${event.id}`}
                  className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                    <span className="text-base font-black leading-none">{event.debut.getDate()}</span>
                    <span className="text-[10px] font-semibold uppercase">
                      {new Intl.DateTimeFormat("fr-FR", {
                        month: "short",
                        timeZone: "Indian/Antananarivo",
                      }).format(event.debut)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-900">
                      {event.titre}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                      {event.lieu} · {event.categorie}
                    </span>
                  </span>
                  <span className="hidden text-xs text-ink-400 sm:block">
                    {formatDate(event.debut)}
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
                Aucun événement à venir pour le moment.
              </p>
            )}
            {modules.has("programme") ? (
              <Link
                href="/programme"
                className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-700 hover:underline"
              >
                Voir tout le programme
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accès rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {quickLinks.length > 0 ? (
              quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                >
                  <link.icon className="h-4 w-4 text-brand-700" aria-hidden />
                  {link.label}
                  <ArrowRight className="ml-auto h-4 w-4 text-ink-300" aria-hidden />
                </Link>
              ))
            ) : (
              <p className="text-sm text-ink-500">Les services seront activés par le BDE.</p>
            )}
            <Link
              href="/profil"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
            >
              <UserRound className="h-4 w-4 text-brand-700" aria-hidden />
              Mon profil
              <ArrowRight className="ml-auto h-4 w-4 text-ink-300" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dernières annonces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {announcements.items.length > 0 ? (
              announcements.items.map((announcement) => (
                <Link
                  key={announcement.id}
                  href={`/annonces/${announcement.id}`}
                  className="block rounded-xl border border-ink-100 p-3 transition hover:bg-ink-50"
                >
                  <p className="text-xs font-semibold text-brand-700">{announcement.categorie}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-ink-900">
                    {announcement.titre}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-400">
                    {formatDateTime(announcement.publieLe ?? announcement.createdAt)}
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
                Aucune annonce pour le moment.
              </p>
            )}
            {modules.has("annonces") ? (
              <Link
                href="/annonces"
                className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-brand-700 hover:underline"
              >
                Toutes les annonces
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </CardContent>
        </Card>

        {scrutin ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5 text-brand-700" aria-hidden />
                Scrutin en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-semibold text-ink-900">{scrutin.titre}</p>
              {vote ? (
                <Alert variant="success" title="Vote enregistré">
                  Ton vote a été enregistré le {formatDateTime(vote.createdAt)}.
                </Alert>
              ) : (
                <p className="text-sm leading-relaxed text-ink-500">
                  Le vote est ouvert. Ton bulletin reste secret et séparé de ton identité.
                </p>
              )}
              <Link
                href={vote ? "/resultats" : "/vote"}
                className={buttonVariants({ variant: vote ? "outline" : "primary", size: "sm" })}
              >
                {vote ? "Voir les résultats" : "Voter maintenant"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Un besoin, une question ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-ink-500">
              <p>
                L’équipe du BDE te répond directement depuis la plateforme. Tes demandes et
                leurs réponses restent accessibles dans ton espace.
              </p>
              {modules.has("demandes") ? (
                <Link href="/demandes/nouvelle" className={buttonVariants({ size: "sm" })}>
                  Contacter le BDE
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      {votesConfidentialNote(Boolean(vote))}
    </div>
  );
}

function votesConfidentialNote(visible: boolean) {
  if (!visible) return null;
  return (
    <p className="mt-6 flex items-start gap-2 text-xs text-ink-400">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      Ton bulletin est séparé de ton identité. Les journaux d’audit indiquent uniquement qu’un
      vote a été enregistré, jamais le choix effectué.
    </p>
  );
}
