import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { AlbumForm } from "@/components/admin/album-form";

export const metadata = { title: "Nouvel album" };
export const dynamic = "force-dynamic";

export default async function NewAlbumPage() {
  await requireStaffPage();
  await requireModule("archives");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/admin/archives" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux archives
      </Link>
      <h1 className="text-2xl font-black tracking-tight text-ink-950">Nouvel album</h1>
      <AlbumForm />
    </div>
  );
}
