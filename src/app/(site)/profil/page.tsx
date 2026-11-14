import type { Metadata } from "next";
import { requireUserPage } from "@/lib/auth/guard";
import { ProfileForm } from "@/components/site/profile-form";

export const metadata: Metadata = { title: "Mon profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUserPage();

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="mb-6">
        <p className="label-caps">Compte</p>
        <h1 className="text-2xl font-black tracking-tight text-ink-950">Mon profil</h1>
        <p className="mt-1 text-sm text-ink-500">
          {user.email ?? user.telephone ?? "Compte BDE"} · {user.role === "ADMIN" ? "Administrateur" : user.role === "MEMBRE_BDE" ? "Membre BDE" : "Étudiant"}
        </p>
      </div>
      <ProfileForm
        email={user.email}
        telephone={user.telephone}
        role={user.role}
        student={
          user.student
            ? {
                prenoms: user.student.prenoms,
                nom: user.student.nom,
                classe: user.student.classe,
                matricule: user.student.matricule,
              }
            : null
        }
        photoUrl={user.photoUrl}
        notificationsEmail={user.notificationsEmail}
        consentementPhotos={user.consentementPhotos}
      />
    </div>
  );
}
