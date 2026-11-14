import Link from "next/link";
import { Activity, ScrollText, Search, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { listAuditLogs } from "@/server/services/audit";
import { auditActionLabel } from "@/lib/audit-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Journal d’audit" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function actionVariant(action: string) {
  if (action.includes("ECHEC") || action.includes("REFUSEE")) return "danger" as const;
  if (action.includes("SUPPRIME") || action.includes("DESACTIVE")) return "warning" as const;
  if (action.includes("PUBLIEE")) return "brand" as const;
  if (
    action.includes("REUSSIE") ||
    action.includes("APPROUVE") ||
    action === "VOTE_ENREGISTRE" ||
    action === "ELECTION_OUVERTE"
  ) {
    return "success" as const;
  }
  if (action === "ELECTION_CLOTUREE" || action === "IMPORT_MATRICULES") return "info" as const;
  return "neutral" as const;
}

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const action = first(params.action) ?? "";
  const page = Number(first(params.page) ?? "1") || 1;

  const data = await listAuditLogs({ q, action, page });
  const actors = new Map(data.actors.map((actor) => [actor.id, actor]));

  return (
    <div className="space-y-5">
      <div>
        <p className="label-caps">Sécurité</p>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          <ScrollText className="h-6 w-6 text-brand-700" aria-hidden />
          Journal d’audit
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Actions sensibles et tentatives d’accès. Le choix de vote n’est jamais journalisé.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Événements"
          value={data.total}
          hint="correspondant aux filtres"
          icon={<ScrollText className="h-5 w-5" />}
        />
        <StatCard
          label="Dernières 24 h"
          value={data.last24h}
          hint="toutes actions confondues"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Types d’action"
          value={data.actions.length}
          hint="référencés dans la base"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto]" method="get">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-400"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Acteur, action ou adresse IP…"
                className="pl-9"
                aria-label="Rechercher dans le journal"
              />
            </div>
            <Select name="action" defaultValue={action} aria-label="Type d’action">
              <option value="">Toutes les actions</option>
              {data.actions.map((item) => (
                <option key={item} value={item}>
                  {auditActionLabel(item)}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>
              Filtrer
            </button>
            {q || action ? (
              <Link href="/admin/audit" className={buttonVariants({ variant: "outline" })}>
                Réinitialiser
              </Link>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-10 w-10" />}
          title="Aucun événement"
          description="Aucune entrée ne correspond aux filtres sélectionnés."
        />
      ) : (
        <Card>
          <div className="table-wrap sm:p-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Acteur</th>
                  <th>IP</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => {
                  const actor = actors.get(log.acteur);
                  const actorName =
                    log.acteur === "anonyme"
                      ? "Anonyme"
                      : actor?.role === "ADMIN"
                        ? (actor.email ?? actor.telephone ?? "Administrateur")
                        : actor?.student
                          ? `${actor.student.prenoms} ${actor.student.nom}`
                          : log.acteur.slice(0, 12);
                  return (
                    <tr key={log.id} className="align-top">
                      <td className="whitespace-nowrap text-xs text-ink-500">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td>
                        <Badge variant={actionVariant(log.action)}>
                          {auditActionLabel(log.action)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5" title={log.acteur}>
                          <span className="text-sm font-medium text-ink-800">{actorName}</span>
                          {actor?.student ? (
                            <span className="text-[11px] text-ink-400">
                              {actor.student.matricule}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-ink-500">
                        {log.ip ?? "—"}
                      </td>
                      <td className="max-w-[380px]">
                        {log.details ? (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-ink-400 hover:text-ink-700">
                              Voir le détail
                            </summary>
                            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-ink-50 p-2 text-[11px] leading-relaxed text-ink-600">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-ink-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data.pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-500">
            Page {data.page} sur {data.pages}
          </p>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                href={`/admin/audit?${new URLSearchParams({ q, action, page: String(data.page - 1) }).toString()}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Précédent
              </Link>
            ) : null}
            {data.page < data.pages ? (
              <Link
                href={`/admin/audit?${new URLSearchParams({ q, action, page: String(data.page + 1) }).toString()}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Suivant
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-ink-400">
        Le journal ne contient ni mot de passe, ni choix de vote. Il ne doit pas être rendu
        public : il révèle des adresses IP et des identifiants internes.
      </p>
    </div>
  );
}
