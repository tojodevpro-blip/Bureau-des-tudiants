import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  PlusCircle,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Users,
  Vote,
} from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { getStudentStats } from "@/server/services/students";
import { getUserStats } from "@/server/services/users";
import {
  getCurrentElection,
  getElectionsForAdminDashboard,
} from "@/server/services/elections";
import { getParticipation } from "@/server/services/voting";
import { prisma } from "@/lib/prisma";
import { ELECTION_STATUS_LABELS, isVoteWindowOpen } from "@/lib/election-status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Alert } from "@/components/ui/alert";
import { ProgressBar } from "@/components/ui/empty-state";
import { formatDateTime, formatPercent } from "@/lib/utils";

export const metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const staff = await requireStaffPage();
  const [studentStats, userStats, electionStats, election, recentLogs] = await Promise.all([
    getStudentStats(),
    getUserStats(),
    getElectionsForAdminDashboard(),
    getCurrentElection(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const participation = election ? await getParticipation(election.id) : null;
  const candidateCount = election
    ? await prisma.candidate.count({ where: { electionId: election.id } })
    : 0;
  const open = election ? isVoteWindowOpen(election) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Administration</p>
          <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Vue d’ensemble des matricules, des comptes et du scrutin en cours.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/etudiants" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Users className="h-4 w-4" aria-hidden />
            Gérer les matricules
          </Link>
          <Link href="/admin/elections" className={buttonVariants({ size: "sm" })}>
            <Vote className="h-4 w-4" aria-hidden />
            Élections
          </Link>
        </div>
      </div>

      {userStats.enAttente > 0 ? (
        <Alert variant="warning" title={`${userStats.enAttente} compte(s) en attente`}>
          Des inscriptions attendent une validation manuelle.{" "}
          <Link href="/admin/utilisateurs" className="font-semibold underline">
            Les examiner
          </Link>
        </Alert>
      ) : null}

      {studentStats.aVerifier > 0 ? (
        <Alert variant="info" title={`${studentStats.aVerifier} matricule(s) à vérifier`}>
          Certaines transcriptions sont incertaines.{" "}
          <Link href="/admin/etudiants?verif=oui" className="font-semibold underline">
            Voir la liste
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Étudiants dans la liste"
          value={studentStats.total}
          hint={`${studentStats.actifs} actifs · ${studentStats.classes} classes`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Matricules réclamés"
          value={studentStats.reclames}
          hint={`${studentStats.total - studentStats.reclames} libres`}
          icon={<UserCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Comptes approuvés"
          value={userStats.approuves}
          hint={`${userStats.enAttente} en attente · ${userStats.rejetes} rejetés`}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Élections"
          value={electionStats.total}
          hint={`${electionStats.brouillons} en préparation · ${electionStats.candidatesCount} candidats`}
          icon={<Vote className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Scrutin actuel</CardTitle>
              <p className="mt-1 text-sm text-ink-500">
                {election ? election.titre : "Aucune élection active"}
              </p>
            </div>
            {election ? (
              <Badge variant={open ? "success" : "neutral"}>
                {open ? "Vote ouvert" : ELECTION_STATUS_LABELS[election.statut]}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {election && participation ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-ink-50 p-3">
                    <p className="text-xs text-ink-500">Votants</p>
                    <p className="text-xl font-bold text-ink-950">{participation.votants}</p>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-3">
                    <p className="text-xs text-ink-500">Inscrits (approuvés)</p>
                    <p className="text-xl font-bold text-ink-950">{participation.inscrits}</p>
                  </div>
                  <div className="rounded-xl bg-ink-50 p-3">
                    <p className="text-xs text-ink-500">Candidats</p>
                    <p className="text-xl font-bold text-ink-950">{candidateCount}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">Taux de participation</span>
                    <span className="font-bold text-ink-950">
                      {formatPercent(participation.taux)}
                    </span>
                  </div>
                  <ProgressBar value={participation.taux} />
                </div>
                <p className="text-xs text-ink-400">
                  Les résultats par candidat restent masqués tant que l’élection n’est pas
                  clôturée.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/elections/${election.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Suivre l’élection
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  {election.ouvreLe && election.fermeLe ? (
                    <span className="self-center text-xs text-ink-500">
                      Du {formatDateTime(election.ouvreLe)} au {formatDateTime(election.fermeLe)}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-500">
                  Aucune élection en cours. Crée un brouillon, ajoute des candidats puis ouvre
                  le vote.
                </p>
                <Link href="/admin/elections" className={buttonVariants({ size: "sm" })}>
                  <PlusCircle className="h-4 w-4" aria-hidden />
                  Créer une élection
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                href: "/admin/etudiants",
                icon: Users,
                label: "Ajouter un matricule",
                text: "Compléter la liste manuellement",
              },
              {
                href: "/admin/import",
                icon: FileSpreadsheet,
                label: "Importer un fichier",
                text: "CSV ou Excel, avec aperçu",
              },
              {
                href: "/admin/utilisateurs",
                icon: ShieldCheck,
                label: "Valider les comptes",
                text: `${userStats.enAttente} en attente`,
              },
              {
                href: "/admin/audit",
                icon: ScrollText,
                label: "Consulter le journal",
                text: "Actions et tentatives",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/50"
              >
                <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
                  <action.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-900">
                    {action.label}
                  </span>
                  <span className="block text-xs text-ink-500">{action.text}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Dernières actions</CardTitle>
          <Link href="/admin/audit" className="link-quiet">
            Tout voir
          </Link>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-ink-500">Aucune action enregistrée.</p>
          ) : (
            <ul className="divide-y divide-ink-50">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800">
                      {log.action.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatDateTime(log.createdAt)} · {log.acteur === "anonyme" ? "Anonyme" : log.acteur.slice(0, 10)}…
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Alert variant="info" title="Sauvegarde avant le vote">
          Effectue une sauvegarde PostgreSQL complète et un test à blanc avant d’ouvrir le
          scrutin. La procédure est décrite dans docs/CHECKLIST-ELECTION.md.
        </Alert>
        <Alert variant="warning" title="Liste des matricules">
          Complète et vérifie la liste avant l’ouverture. Les imports ne suppriment jamais de
          données et ne cassent pas les comptes existants.
        </Alert>
      </div>
    </div>
  );
}
