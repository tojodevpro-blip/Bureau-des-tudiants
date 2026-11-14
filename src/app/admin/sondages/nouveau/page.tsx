import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { PollForm } from "@/components/admin/poll-form";

export const metadata = { title: "Nouveau sondage" };
export const dynamic = "force-dynamic";

export default async function NewPollPage() {
  await requireStaffPage();
  await requireModule("sondages");
  const students = await prisma.student.findMany({ distinct: ["classe"], select: { classe: true }, orderBy: { classe: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/sondages" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux sondages
      </Link>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">Nouveau sondage</h1>
        <p className="mt-1 text-sm text-ink-500">Le sondage est créé en brouillon. Ouvre-le ensuite pour le rendre visible.</p>
      </div>
      <PollForm availableClasses={students.map((student) => student.classe)} />
    </div>
  );
}
