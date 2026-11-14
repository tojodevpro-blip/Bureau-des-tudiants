import Link from "next/link";
import { Activity, CheckCircle2, Wrench, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";
import { LegalPage, LegalSection } from "@/components/site/legal-page";

export const metadata = { title: "État du service" };
export const dynamic = "force-dynamic";

async function checkStatus() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [maintenance, message] = await Promise.all([
      getSetting("mode_maintenance", "false"),
      getSetting(
        "message_maintenance",
        "La plateforme est en maintenance. Le BDE revient très vite.",
      ),
    ]);
    return {
      database: true,
      maintenance: maintenance === "true",
      message,
      latency: Date.now() - startedAt,
      checkedAt: new Date(),
    };
  } catch {
    return {
      database: false,
      maintenance: false,
      message: "",
      latency: Date.now() - startedAt,
      checkedAt: new Date(),
    };
  }
}

function StatusRow({
  label,
  ok,
  detail,
  loading,
}: {
  label: string;
  ok: boolean;
  detail: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-100 p-4">
      <div>
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        <p className="mt-0.5 text-xs text-ink-500">{detail}</p>
      </div>
      <span
        className={
          ok
            ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
            : "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
        }
      >
        {ok ? (
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <XCircle className="h-3.5 w-3.5" aria-hidden />
        )}
        {loading ? "Vérification…" : ok ? "Opérationnel" : "Indisponible"}
      </span>
    </div>
  );
}

export default async function StatusPage() {
  const status = await checkStatus();
  const healthy = status.database && !status.maintenance;

  return (
    <LegalPage
      eyebrow="Transparence"
      title="État du service"
      intro="Disponibilité de la plateforme et de ses composants essentiels, vérifiée à l’ouverture de cette page."
      updatedAt={formatDateTime(status.checkedAt)}
      icon={Activity}
    >
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
              État général
            </p>
            <p className="mt-1 text-xl font-black text-ink-950">
              {healthy ? "Tous les services sont opérationnels" : "Service partiellement disponible"}
            </p>
          </div>
          <span
            className={
              healthy
                ? "inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                : "inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700"
            }
          >
            {status.maintenance ? (
              <Wrench className="h-4 w-4" aria-hidden />
            ) : status.database ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden />
            )}
            {status.maintenance ? "Maintenance" : status.database ? "En ligne" : "Incident"}
          </span>
        </div>

        <div className="mt-5 space-y-2">
          <StatusRow
            label="Plateforme web"
            ok
            detail="Les pages publiques et les espaces connectés répondent."
          />
          <StatusRow
            label="Base de données"
            ok={status.database}
            detail={
              status.database
                ? `Connexion vérifiée en ${status.latency} ms.`
                : "La base de données ne répond pas pour le moment."
            }
          />
          <StatusRow
            label="Mode maintenance"
            ok={!status.maintenance}
            detail={
              status.maintenance
                ? status.message || "La plateforme est en maintenance."
                : "Aucune maintenance programmée n’est active."
            }
          />
        </div>

        <p className="mt-4 text-xs text-ink-400">
          Dernière vérification : {formatDateTime(status.checkedAt)}. Cette page est actualisée à
          chaque ouverture. Le contrôle technique brut est disponible sur{" "}
          <Link href="/api/health" className="font-semibold text-brand-700 hover:underline">
            /api/health
          </Link>
          .
        </p>
      </section>

      <LegalSection title="En cas d’incident">
        <p>
          Si un service ne répond pas, réessaie dans quelques minutes. Si le problème persiste,
          contacte le BDE via le{" "}
          <Link href="/demandes/nouvelle" className="font-semibold text-brand-700 hover:underline">
            formulaire de demande
          </Link>{" "}
          en précisant la page concernée et l’heure de l’incident.
        </p>
      </LegalSection>

      <LegalSection title="Maintenance">
        <p>
          Les opérations de maintenance sont annoncées lorsque c’est possible. Pendant une
          maintenance, l’accès à la plateforme peut être temporairement remplacé par une page
          d’information.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
