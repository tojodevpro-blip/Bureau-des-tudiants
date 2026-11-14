import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { requireStaffPage } from "@/lib/auth/guard";
import { requireModule } from "@/lib/modules";
import { formatDate } from "@/lib/utils";
import { listDocumentsForAdmin } from "@/server/services/archives";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentDelete } from "@/components/admin/document-delete";
import { DocumentUploader } from "@/components/admin/document-uploader";

export const metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  await requireStaffPage();
  await requireModule("archives");
  const documents = await listDocumentsForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/admin/archives" className="link-quiet inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux archives
      </Link>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-950">
          <FileText className="h-6 w-6 text-brand-700" aria-hidden />
          Documents
        </h1>
        <p className="mt-1 text-sm text-ink-500">PDF, DOCX et XLSX, 10 Mo maximum par fichier.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Ajouter un document</CardTitle></CardHeader>
        <CardContent><DocumentUploader /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documents publiés ({documents.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <p className="p-5 text-sm text-ink-500">Aucun document publié.</p>
          ) : (
            <div className="divide-y divide-ink-100">
              {documents.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{document.categorie}</Badge>
                      <span className="text-xs text-ink-400">{formatDate(document.dateDocument)}</span>
                    </div>
                    <p className="mt-1 truncate font-semibold text-ink-900">{document.titre}</p>
                    <p className="text-xs text-ink-500">
                      {document.nom} · {Math.ceil(document.taille / 1024)} Ko · ajouté par {document.createdBy.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={document.downloadUrl} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <Download className="h-4 w-4" aria-hidden />
                      Télécharger
                    </a>
                    <DocumentDelete id={document.id} titre={document.titre} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
