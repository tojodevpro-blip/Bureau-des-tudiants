import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { EventForm } from "@/components/admin/event-form";

export const metadata = { title: "Nouvel événement" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireStaffPage();
  await requireModule("programme");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/programme" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour au programme
      </Link>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">Nouvel événement</h1>
        <p className="mt-1 text-sm text-ink-500">Les étudiants inscrits et approuvés seront notifiés à la création.</p>
      </div>
      <EventForm />
    </div>
  );
}
