import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LegalPage, LegalSection } from "@/components/site/legal-page";

export const metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Confiance"
      title="Politique de confidentialité"
      intro="Cette page explique quelles données la plateforme du BDE utilise, pourquoi elles sont nécessaires et comment exercer tes droits."
      updatedAt="11 novembre 2026"
      icon={ShieldCheck}
    >
      <LegalSection title="Qui est responsable du traitement ?">
        <p>
          La plateforme est éditée par le Bureau des Étudiants (BDE). L’équipe habilitée du BDE
          traite les données nécessaires au fonctionnement des services étudiants. Pour toute
          question, utilise le{" "}
          <Link href="/demandes/nouvelle" className="font-semibold text-brand-700 hover:underline">
            formulaire de demande
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Données utilisées">
        <p>Selon les services que tu utilises, la plateforme peut traiter :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            tes données d’identité et de scolarité : nom, prénoms, matricule, classe et statut de
            vérification ;
          </li>
          <li>
            tes coordonnées et informations de compte : email, téléphone, photo de profil, mot de
            passe stocké sous forme d’empreinte non réversible ;
          </li>
          <li>
            tes contenus et activités : annonces lues, demandes, réponses, messages, sondages,
            inscriptions aux événements, candidatures et votes ;
          </li>
          <li>
            les données de trésorerie et de paiement saisies par les trésoriers, y compris le
            payeur, la référence et le moyen de paiement ;
          </li>
          <li>
            les données techniques nécessaires à la sécurité : adresse IP, journaux de connexion et
            journal d’audit des actions sensibles.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Pourquoi ces données sont-elles traitées ?">
        <ul className="list-disc space-y-1 pl-5">
          <li>créer et sécuriser ton compte, vérifier ton appartenance à la communauté étudiante ;</li>
          <li>fournir les services du BDE : annonces, événements, demandes, discussions et sondages ;</li>
          <li>gérer les candidatures et le scrutin dans le respect du secret du vote ;</li>
          <li>assurer le suivi comptable des recettes et dépenses du BDE ;</li>
          <li>prévenir la fraude, modérer les contenus et protéger les utilisateurs.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Qui peut accéder aux données ?">
        <p>
          Les données sont accessibles uniquement aux membres du BDE dont le rôle le justifie. Les
          prestataires techniques (hébergement, base de données, stockage de fichiers ou envoi
          d’emails) peuvent les traiter pour le compte du BDE, dans la limite de leurs prestations.
          Les données ne sont ni vendues ni utilisées pour de la publicité ciblée.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <p>
          Les données de compte sont conservées tant que le compte reste actif. Les contenus et
          journaux techniques sont conservés pendant la durée nécessaire au service, à la sécurité
          et au traitement des signalements, puis supprimés ou anonymisés. Les données comptables
          peuvent être conservées plus longtemps pour répondre aux obligations de suivi du BDE.
        </p>
      </LegalSection>

      <LegalSection title="Cookies et stockage local">
        <p>
          La plateforme utilise uniquement des cookies et stockages nécessaires au fonctionnement :
          session de connexion, protection contre les requêtes frauduleuses, préférences d’affichage
          et mode maintenance. Aucun cookie publicitaire n’est déposé.
        </p>
      </LegalSection>

      <LegalSection title="Tes droits">
        <p>
          Tu peux demander l’accès à tes données, leur rectification ou leur effacement, et t’opposer
          à certains traitements. Certaines demandes peuvent être limitées lorsque la loi, la
          sécurité du scrutin ou la conservation comptable l’exigent. Adresse ta demande via le{" "}
          <Link href="/demandes/nouvelle" className="font-semibold text-brand-700 hover:underline">
            formulaire de contact
          </Link>{" "}
          en précisant l’objet de ta demande.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les mots de passe sont stockés sous forme d’empreinte, les sessions sont signées et les
          accès sensibles sont contrôlés par rôle et journalisés. La plateforme doit être utilisée en
          HTTPS en production. Aucun système ne peut toutefois garantir une sécurité absolue :
          signale immédiatement toute activité suspecte au BDE.
        </p>
      </LegalSection>

      <LegalSection title="Évolution de cette politique">
        <p>
          Cette politique peut être mise à jour lorsque les services ou les obligations du BDE
          évoluent. La date de dernière mise à jour est indiquée en haut de page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
