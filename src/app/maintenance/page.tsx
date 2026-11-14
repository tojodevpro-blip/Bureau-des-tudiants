import Link from "next/link";
import { Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMaintenanceMessage } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const message = await getMaintenanceMessage();
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-ink-50 p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="surface max-w-lg p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Wrench className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-black text-ink-950">Maintenance en cours</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{message}</p>
        <Link href="/" className="mt-6 inline-flex rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">
          Réessayer
        </Link>
      </div>
    </main>
  );
}
