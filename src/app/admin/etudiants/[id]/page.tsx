import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/guard";
import { getStudentById, studentDisplayName } from "@/server/services/students";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { EditStudentForm } from "@/components/admin/edit-student-form";
import { maskIdentifiant } from "@/lib/utils";

export const metadata = { title: "Modifier un étudiant" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditStudentPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id } = await params;
  const student = await getStudentById(id);
  if (!student) notFound();

  const classes = await prisma.student.findMany({
    distinct: ["classe"],
    select: { classe: true },
    orderBy: { classe: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/etudiants" className="link-quiet inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour aux matricules
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          {studentDisplayName(student)}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Matricule <span className="font-mono font-semibold">{student.matricule}</span> ·{" "}
          {student.classe}
        </p>
      </div>

      {student.claimedBy ? (
        <Alert variant="info" title="Matricule réclamé">
          Compte associé : {maskIdentifiant(student.claimedBy.email ?? student.claimedBy.telephone)} ·{" "}
          <Badge
            variant={
              student.claimedBy.statut === "EN_ATTENTE"
                ? "warning"
                : student.claimedBy.statut === "REJETE"
                  ? "danger"
                  : "success"
            }
          >
            {student.claimedBy.statut}
          </Badge>{" "}
          · {student.claimedBy._count.participations} vote(s) enregistré(s).
        </Alert>
      ) : null}

      {student.noteVerification ? (
        <Alert variant="warning" title="Transcription à vérifier">
          {student.noteVerification}
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Informations de l’étudiant</CardTitle>
        </CardHeader>
        <CardContent>
          <EditStudentForm
            student={{
              id: student.id,
              matricule: student.matricule,
              nom: student.nom,
              prenoms: student.prenoms,
              classe: student.classe,
              noteVerification: student.noteVerification ?? "",
              actif: student.actif,
            }}
            classes={classes.map((item) => item.classe)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-5 text-sm text-ink-500">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p>
            Modifier le nom ou le matricule d’un étudiant déjà réclamé peut compliquer la
            vérification d’identité. Vérifie les fiches avant de modifier. La liste n’est
            jamais publique.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
