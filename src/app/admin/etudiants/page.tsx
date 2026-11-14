import Link from "next/link";
import { AlertTriangle, Plus, Search, Users } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { listStudents } from "@/server/services/students";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { AddStudentDialog } from "@/components/admin/add-student-dialog";
import { StudentRowActions } from "@/components/admin/student-row-actions";
import { maskIdentifiant } from "@/lib/utils";

export const metadata = { title: "Matricules" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const classe = first(params.classe) ?? "";
  const statut = first(params.statut) ?? "";
  const verif = first(params.verif) ?? "";
  const page = Number(first(params.page) ?? "1") || 1;

  const data = await listStudents({ q, classe, statut, verif, page });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Gestion</p>
          <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            Matricules étudiants
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {data.stats.total} étudiants · {data.stats.reclames} réclamés ·{" "}
            {data.stats.aVerifier} à vérifier
          </p>
        </div>
        <AddStudentDialog classes={data.classes} />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto]" method="get">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-ink-400" aria-hidden />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Matricule, nom, prénoms, classe…"
                className="pl-9"
                aria-label="Rechercher"
              />
            </div>
            <Select name="classe" defaultValue={classe} aria-label="Classe">
              <option value="">Toutes les classes</option>
              {data.classes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select name="statut" defaultValue={statut} aria-label="Statut de réclamation">
              <option value="">Tous les statuts</option>
              <option value="libre">Libre</option>
              <option value="reclame">Réclamé</option>
            </Select>
            <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-700">
              <input
                type="checkbox"
                name="verif"
                value="oui"
                defaultChecked={verif === "oui"}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              À vérifier
            </label>
            <button type="submit" className={buttonVariants({ variant: "secondary" })}>
              Filtrer
            </button>
          </form>
          {(q || classe || statut || verif) && (
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
              <span>{data.total} résultat(s)</span>
              <Link href="/admin/etudiants" className="font-semibold text-brand-700 hover:underline">
                Réinitialiser
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Aucun étudiant trouvé"
          description="Modifie les filtres ou ajoute un matricule manuellement."
          action={<AddStudentDialog classes={data.classes} />}
        />
      ) : (
        <Card>
          <div className="table-wrap sm:p-2">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Étudiant</th>
                  <th>Classe</th>
                  <th>Réclamation</th>
                  <th>Compte</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-sm font-semibold text-ink-900">
                          {student.matricule}
                        </span>
                        {student.matriculeBrut && student.matriculeBrut !== student.matricule ? (
                          <span className="text-[11px] text-ink-400">
                            saisi : {student.matriculeBrut}
                          </span>
                        ) : null}
                        {!student.actif ? <Badge variant="danger">Désactivé</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-ink-900">
                          {student.nom} {student.prenoms}
                        </span>
                        {student.noteVerification ? (
                          <span
                            className="inline-flex max-w-[260px] items-center gap-1 text-[11px] text-amber-700"
                            title={student.noteVerification}
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">À vérifier : {student.noteVerification}</span>
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-xs">{student.classe}</td>
                    <td>
                      {student.claimedBy ? (
                        <Badge variant="success">Réclamé</Badge>
                      ) : (
                        <Badge>Libre</Badge>
                      )}
                    </td>
                    <td>
                      {student.claimedBy ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-ink-700">
                            {maskIdentifiant(student.claimedBy.email ?? student.claimedBy.telephone)}
                          </span>
                          <Badge
                            variant={
                              student.claimedBy.statut === "EN_ATTENTE"
                                ? "warning"
                                : student.claimedBy.statut === "REJETE"
                                  ? "danger"
                                  : "success"
                            }
                          >
                            {student.claimedBy.statut === "EN_ATTENTE"
                              ? "En attente"
                              : student.claimedBy.statut === "REJETE"
                                ? "Rejeté"
                                : "Approuvé"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td>
                      <StudentRowActions
                        id={student.id}
                        actif={student.actif}
                        claimed={Boolean(student.claimedBy)}
                        hasVoted={(student.claimedBy?._count.participations ?? 0) > 0}
                      />
                    </td>
                  </tr>
                ))}
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
                href={`/admin/etudiants?${new URLSearchParams({ q, classe, statut, verif, page: String(data.page - 1) }).toString()}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Précédent
              </Link>
            ) : null}
            {data.page < data.pages ? (
              <Link
                href={`/admin/etudiants?${new URLSearchParams({ q, classe, statut, verif, page: String(data.page + 1) }).toString()}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Suivant
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-ink-400">
        Les matricules sont normalisés automatiquement (CAN31/01 devient CAN31/001). La liste
        contient des données personnelles : elle n’est jamais publique.
      </p>
    </div>
  );
}
