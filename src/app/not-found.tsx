import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Compass className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Erreur 404</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-950">
        Cette page n’existe pas
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        Le lien est peut-être obsolète, ou la page a été déplacée. Retourne à l’accueil ou à ton
        espace personnel.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants()}>
          Retour à l’accueil
        </Link>
        <Link href="/tableau-de-bord" className={buttonVariants({ variant: "outline" })}>
          Mon espace
        </Link>
      </div>
    </div>
  );
}
