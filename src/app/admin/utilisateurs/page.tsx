import { Clock3, ShieldCheck, Users } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { getSetting, SETTING_MANUAL_APPROVAL } from "@/lib/settings";
import { listPendingUsers, listRecentUsers, getUserStats, listStaffUsers } from "@/server/services/users";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { UserApprovalActions } from "@/components/admin/user-approval-actions";
import { ManualApprovalSetting } from "@/components/admin/manual-approval-setting";
import { UserRoleActions } from "@/components/admin/user-role-actions";
import { formatDateTime, maskIdentifiant } from "@/lib/utils";

export const metadata = { title: "Comptes" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdminPage();
  const [pending, recent, stats, manualValue, staff] = await Promise.all([
    listPendingUsers(),
    listRecentUsers(30),
    getUserStats(),
    getSetting(SETTING_MANUAL_APPROVAL, "false"),
    listStaffUsers(),
  ]);

  const manualApproval = manualValue === "true";

  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Gestion</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          <ShieldCheck className="h-6 w-6 text-brand-700" aria-hidden />
          Comptes étudiants
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Valide les inscriptions en attente et consulte les derniers comptes créés.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Comptes étudiants" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Approuvés" value={stats.approuves} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="En attente" value={stats.enAttente} icon={<Clock3 className="h-5 w-5" />} />
        <StatCard label="Rejetés" value={stats.rejetes} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Équipe BDE et rôles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-ink-500">
            Les membres BDE publient et modèrent les annonces, demandes, événements, archives,
            messages et sondages. La trésorerie reste réservée aux administrateurs et aux membres
            BDE qui en reçoivent explicitement l’accès. Les administrateurs gèrent aussi les
            élections, les comptes et les réglages. Un changement de rôle force la reconnexion du
            compte concerné.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Identifiant</th>
                  <th>Rôle actuel</th>
                  <th>Modifier</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <span className="font-medium text-ink-900">
                        {member.student ? `${member.student.prenoms} ${member.student.nom}` : (member.email ?? "Compte BDE")}
                      </span>
                      {member.student ? <span className="block text-xs text-ink-400">{member.student.matricule}</span> : null}
                    </td>
                    <td className="text-xs text-ink-500">{member.email ?? member.telephone ?? "—"}</td>
                    <td>
                      <Badge variant={member.role === "ADMIN" ? "brand" : "info"}>
                        {member.role === "ADMIN" ? "Administrateur" : "Membre BDE"}
                      </Badge>
                    </td>
                    <td>
                      <UserRoleActions
                        userId={member.id}
                        role={member.role}
                        tresorerieAccess={member.tresorerieAccess}
                        self={member.id === admin.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validation manuelle des inscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-500">
            Lorsqu’elle est activée, chaque nouvelle inscription reste « en attente » jusqu’à
            approbation par un administrateur. Les comptes déjà approuvés ne sont pas affectés.
          </p>
          <ManualApprovalSetting initial={manualApproval} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Inscriptions en attente</CardTitle>
          <Badge variant={pending.length > 0 ? "warning" : "neutral"}>
            {pending.length}
          </Badge>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState
              icon={<Clock3 className="h-8 w-8" />}
              title="Aucun compte en attente"
              description="Les nouvelles inscriptions apparaîtront ici si la validation manuelle est activée."
            />
          ) : (
            <ul className="divide-y divide-ink-50">
              {pending.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">
                      {user.student
                        ? `${user.student.prenoms} ${user.student.nom}`
                        : "Étudiant"}
                    </p>
                    <p className="text-xs text-ink-500">
                      {user.student?.matricule} · {user.student?.classe}
                    </p>
                    <p className="text-xs text-ink-400">
                      {maskIdentifiant(user.email ?? user.telephone)} · inscrit le{" "}
                      {formatDateTime(user.createdAt)}
                    </p>
                    {user.student?.noteVerification ? (
                      <p className="mt-1 text-[11px] text-amber-700">
                        À vérifier : {user.student.noteVerification}
                      </p>
                    ) : null}
                  </div>
                  <UserApprovalActions userId={user.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!manualApproval ? (
        <Alert variant="info" title="Validation manuelle désactivée">
          Les nouvelles inscriptions sont approuvées automatiquement. Active la validation
          manuelle ci-dessus si tu souhaites contrôler chaque compte avant le vote.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Derniers comptes créés</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500">Aucun compte étudiant pour le moment.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Matricule</th>
                    <th>Classe</th>
                    <th>Statut</th>
                    <th>Rôle</th>
                    <th>Votes</th>
                    <th>Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-ink-900">
                            {user.student
                              ? `${user.student.prenoms} ${user.student.nom}`
                              : "—"}
                          </span>
                          <span className="text-xs text-ink-400">
                            {maskIdentifiant(user.email ?? user.telephone)}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-xs">{user.student?.matricule ?? "—"}</td>
                      <td className="text-xs">{user.student?.classe ?? "—"}</td>
                      <td>
                        <Badge
                          variant={
                            user.statut === "APPROUVE"
                              ? "success"
                              : user.statut === "EN_ATTENTE"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {user.statut === "APPROUVE"
                            ? "Approuvé"
                            : user.statut === "EN_ATTENTE"
                              ? "En attente"
                              : "Rejeté"}
                        </Badge>
                      </td>
                      <td>
                        <UserRoleActions
                          userId={user.id}
                          role={user.role}
                          tresorerieAccess={user.tresorerieAccess}
                          self={user.id === admin.id}
                        />
                      </td>
                      <td className="text-xs">{user._count.participations}</td>
                      <td className="whitespace-nowrap text-xs text-ink-500">
                        {formatDateTime(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
