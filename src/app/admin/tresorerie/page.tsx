import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PlusCircle,
  Receipt,
  Scale,
  Wallet,
} from "lucide-react";
import type { TreasuryEntryType } from "@prisma/client";
import { requireTreasuryPage } from "@/lib/auth/guard";
import { parsePagination } from "@/lib/pagination";
import { formatDate, formatMoney } from "@/lib/utils";
import {
  TREASURY_CATEGORIES_ALL,
  TREASURY_PAYMENT_LABELS,
  TREASURY_TYPE_LABELS,
} from "@/lib/treasury";
import { listTreasuryEntries } from "@/server/services/treasury";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { TreasuryEntryActions } from "@/components/admin/treasury-entry-actions";

export const metadata = { title: "Trésorerie" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireTreasuryPage();
  const params = await searchParams;
  const { page, pageSize } = parsePagination({ page: Number(first(params.page)) });
  const typeValue = first(params.type);
  const type: TreasuryEntryType | undefined =
    typeValue === "RECETTE" || typeValue === "DEPENSE" ? typeValue : undefined;
  const q = first(params.q) ?? "";
  const categorie = first(params.categorie) ?? "";
  const eventId = first(params.eventId) ?? "";
  const from = first(params.from) ?? "";
  const to = first(params.to) ?? "";

  const data = await listTreasuryEntries({
    type,
    categorie: categorie || undefined,
    eventId: eventId || undefined,
    q: q.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize,
  });

  const hasFilters = Boolean(q || categorie || eventId || from || to || type);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps">Gestion financière</p>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
            <Wallet className="h-6 w-6 text-brand-700" aria-hidden />
            Trésorerie
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Recettes, dépenses et solde du BDE. Chaque opération reste modifiable et journalisée.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/tresorerie/paiements"
            className={buttonVariants({ variant: "outline" })}
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            Paiements en ligne
          </Link>
          <Link href="/admin/tresorerie/nouvelle" className={buttonVariants()}>
            <PlusCircle className="h-4 w-4" aria-hidden />
            Nouvelle opération
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Solde"
          value={formatMoney(data.solde)}
          hint="recettes moins dépenses"
          icon={<Scale className="h-5 w-5" />}
        />
        <StatCard
          label="Recettes"
          value={formatMoney(data.recettes)}
          hint="selon les filtres actifs"
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
        <StatCard
          label="Dépenses"
          value={formatMoney(data.depenses)}
          hint="selon les filtres actifs"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          label="Opérations"
          value={data.total}
          hint={`${Math.ceil(data.total / pageSize) || 1} page(s)`}
          icon={<Receipt className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_1fr_1fr_0.8fr_0.8fr_auto]"
            method="get"
          >
            <Input
              name="q"
              defaultValue={q}
              placeholder="Libellé, référence ou note…"
              aria-label="Rechercher une opération"
            />
            <Select name="type" defaultValue={type ?? ""} aria-label="Filtrer par type">
              <option value="">Tous les types</option>
              <option value="RECETTE">Recettes</option>
              <option value="DEPENSE">Dépenses</option>
            </Select>
            <Input
              name="categorie"
              defaultValue={categorie}
              list="treasury-filter-categories"
              placeholder="Catégorie"
              aria-label="Filtrer par catégorie"
            />
            <datalist id="treasury-filter-categories">
              {TREASURY_CATEGORIES_ALL.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <Select name="eventId" defaultValue={eventId} aria-label="Filtrer par événement">
              <option value="">Tous les événements</option>
              {data.events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titre}
                </option>
              ))}
            </Select>
            <Input
              name="from"
              type="date"
              defaultValue={from}
              aria-label="Date de début"
              title="Du"
            />
            <Input
              name="to"
              type="date"
              defaultValue={to}
              aria-label="Date de fin"
              title="Au"
            />
            <div className="flex gap-2">
              <button type="submit" className={buttonVariants({ variant: "secondary" })}>
                Filtrer
              </button>
              {hasFilters ? (
                <Link href="/admin/tresorerie" className={buttonVariants({ variant: "outline" })}>
                  Effacer
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Opérations</CardTitle>
            <Badge variant="neutral">{data.total}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {data.items.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<Wallet className="h-9 w-9" />}
                  title="Aucune opération"
                  description={
                    hasFilters
                      ? "Aucune opération ne correspond aux filtres sélectionnés."
                      : "Ajoute une première recette ou dépense pour démarrer le suivi."
                  }
                  action={
                    <Link href="/admin/tresorerie/nouvelle" className={buttonVariants()}>
                      <PlusCircle className="h-4 w-4" aria-hidden />
                      Nouvelle opération
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Opération</th>
                      <th>Moyen</th>
                      <th>Type</th>
                      <th className="text-right">Montant</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((entry) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap text-xs text-ink-500">
                          {formatDate(entry.date)}
                        </td>
                        <td>
                          <p className="font-medium text-ink-900">{entry.libelle}</p>
                          <p className="text-xs text-ink-400">
                            {entry.categorie}
                            {entry.event ? ` · ${entry.event.titre}` : ""}
                          </p>
                          {entry.payeur ? (
                            <p className="text-[11px] text-ink-400">Payeur : {entry.payeur}</p>
                          ) : null}
                          {entry.reference ? (
                            <p className="text-[11px] text-ink-400">Réf. {entry.reference}</p>
                          ) : null}
                        </td>
                        <td className="text-xs text-ink-500">
                          {TREASURY_PAYMENT_LABELS[entry.moyenPaiement]}
                        </td>
                        <td>
                          <Badge variant={entry.type === "RECETTE" ? "success" : "danger"}>
                            {TREASURY_TYPE_LABELS[entry.type]}
                          </Badge>
                        </td>
                        <td
                          className={
                            entry.type === "RECETTE"
                              ? "whitespace-nowrap text-right font-semibold text-brand-700"
                              : "whitespace-nowrap text-right font-semibold text-red-600"
                          }
                        >
                          {entry.type === "RECETTE" ? "+" : "−"} {formatMoney(entry.montant)}
                        </td>
                        <td>
                          <TreasuryEntryActions id={entry.id} type={entry.type} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Répartition</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-ink-500">Aucune donnée sur cette période.</p>
              ) : (
                data.byCategory.slice(0, 8).map((item) => (
                  <div key={`${item.type}-${item.categorie}`} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-ink-600">{item.categorie}</span>
                      <span
                        className={
                          item.type === "RECETTE"
                            ? "shrink-0 font-semibold text-brand-700"
                            : "shrink-0 font-semibold text-red-600"
                        }
                      >
                        {formatMoney(item._sum.montant ?? 0)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={
                          item.type === "RECETTE"
                            ? "h-full rounded-full bg-brand-500"
                            : "h-full rounded-full bg-red-400"
                        }
                        style={{
                          width: `${Math.max(
                            4,
                            Math.min(
                              100,
                              ((item._sum.montant ?? 0) /
                                Math.max(data.recettes, data.depenses, 1)) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <CreditCard className="h-4 w-4 text-brand-700" aria-hidden />
                Paiements en ligne
              </p>
              <p className="text-xs leading-relaxed text-ink-500">
                MVola et Airtel Money seront disponibles lorsque les accès API seront fournis.
                En attendant, enregistre les encaissements manuellement.
              </p>
              <Link href="/admin/tresorerie/paiements" className="link-quiet text-xs">
                Voir les prérequis
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Pagination
        page={page}
        total={data.total}
        pageSize={pageSize}
        basePath="/admin/tresorerie"
        query={{
          q,
          type: type ?? "",
          categorie,
          eventId,
          from,
          to,
        }}
      />
    </div>
  );
}
