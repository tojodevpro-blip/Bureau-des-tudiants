import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { requireModule } from "@/lib/modules";
import { formatDateTime } from "@/lib/utils";
import { listFaq } from "@/server/services/requests";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

export default async function FaqPage() {
  await requireModule("demandes");
  const faq = await listFaq();

  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <p className="label-caps">Aide</p>
      <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
        <HelpCircle className="h-7 w-7 text-brand-700" aria-hidden />
        Questions fréquentes
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Les réponses publiées par l’équipe BDE à partir des demandes étudiantes.
      </p>

      {faq.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<HelpCircle className="h-10 w-10" />}
          title="La FAQ se prépare"
          description="Aucune question n’a encore été publiée. Tu peux nous contacter directement."
          action={<Link href="/demandes/nouvelle" className={buttonVariants()}>Poser une question</Link>}
        />
      ) : (
        <div className="mt-6 space-y-3">
          {faq.map((item) => (
            <details key={item.id} className="surface group p-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-semibold text-ink-950">
                <span>{item.question}</span>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-500">{item.categorie}</span>
              </summary>
              <p className="mt-3 whitespace-pre-line border-t border-ink-100 pt-3 text-sm leading-relaxed text-ink-600">
                {item.reponse}
              </p>
              {item.date ? <p className="mt-2 text-xs text-ink-400">Réponse publiée le {formatDateTime(item.date)}</p> : null}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
