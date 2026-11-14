"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="h-8 w-8" aria-hidden />
      </span>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">
        Erreur inattendue
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-950">
        Une erreur est survenue
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        Réessaie dans un instant. Si le problème persiste, contacte l’administration du BDE.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-ink-300">Référence : {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Réessayer
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Retour à l’accueil
        </Link>
      </div>
    </div>
  );
}
