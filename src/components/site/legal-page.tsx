import type { LucideIcon } from "lucide-react";

export function LegalPage({
  eyebrow,
  title,
  intro,
  updatedAt,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page max-w-3xl py-10 sm:py-14">
      <p className="label-caps">{eyebrow}</p>
      <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
        <Icon className="h-7 w-7 text-brand-700" aria-hidden />
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{intro}</p>
      <p className="mt-1 text-xs text-ink-400">Dernière mise à jour : {updatedAt}</p>
      <div className="mt-8 space-y-4">{children}</div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-5 sm:p-6">
      <h2 className="text-base font-bold text-ink-950">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}
