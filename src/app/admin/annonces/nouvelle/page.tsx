import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { AnnouncementForm } from "@/components/admin/announcement-form";

export const metadata = { title: "Nouvelle annonce" };
export const dynamic = "force-dynamic";

export default async function NewAnnouncementPage() {
  await requireStaffPage();
  const students = await prisma.student.findMany({
    distinct: ["classe"],
    select: { classe: true },
    orderBy: { classe: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/annonces" className="link-quiet inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux annonces
        </Link>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink-950">Nouvelle annonce</h1>
        <p className="mt-1 text-sm text-ink-500">
          Enregistre en brouillon pour relire, ou publie directement.
        </p>
      </div>
      <AnnouncementForm availableClasses={students.map((student) => student.classe)} />
    </div>
  );
}
