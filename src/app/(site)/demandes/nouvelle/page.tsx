import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStudentPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { RequestForm } from "@/components/site/request-form";

export const metadata = { title: "Nouvelle demande" };
export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  await requireStudentPage();
  await requireModule("demandes");

  return (
    <div className="container-page max-w-2xl py-10 sm:py-14">
      <Link href="/demandes" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à mes demandes
      </Link>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-ink-950">Nouvelle demande</h1>
      <p className="mt-1 text-sm text-ink-500">
        Explique clairement ta situation. L’équipe BDE te répondra dans les meilleurs délais.
      </p>
      <div className="mt-6">
        <RequestForm />
      </div>
    </div>
  );
}
