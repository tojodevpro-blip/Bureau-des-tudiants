import Link from "next/link";
import { ScrollText } from "lucide-react";
import { LegalPage, LegalSection } from "@/components/site/legal-page";

export const metadata = { title: "Conditions d’usage" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Cadre d’utilisation"
      title="Conditions d’usage"
      intro="En créant un compte ou en utilisant la plateforme, tu acceptes les règles ci-dessous. Elles protègent la communauté et la qualité des services du BDE."
      updatedAt="11 novembre 2026"
      icon={ScrollText}
    >
      <LegalSection title="Objet de la plateforme">
        <p>
          La plateforme est un espace communautaire du Bureau des Étudiants. Elle permet de
          consulter les annonces et le programme, de contacter le BDE, d’échanger dans les canaux,
          de participer aux sondages et, lorsque le module est activé, aux candidatures et aux
          élections.
        </p>
      </LegalSection>

      <LegalSection title="Compte et vérification">
        <ul className="list-disc space-y-1 pl-5">
          <li>un seul compte par étudiant, rattaché à un matricule vérifié par le BDE ;</li>
          <li>les informations fournies doivent être exactes et tenues à jour ;</li>
          <li>tu es responsable de la confidentialité de ton mot de passe et des actions faites depuis ton compte ;</li>
          <li>le BDE peut demander une vérification complémentaire ou suspendre un compte en cas de doute légitime.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Règles de conduite">
        <p>Il est interdit de :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>harceler, menacer, discriminer ou usurper l’identité d’une autre personne ;</li>
          <li>publier des contenus illégaux, diffamatoires, haineux, violents ou portant atteinte à la vie privée ;</li>
          <li>envoyer du spam, des publicités non autorisées ou des fichiers malveillants ;</li>
          <li>tenter d’accéder à un espace, un compte ou une donnée sans autorisation ;</li>
          <li>perturber le service, extraire massivement des données ou contourner les mesures de sécurité.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Contenus publiés">
        <p>
          Tu restes responsable des contenus que tu publies. En les publiant, tu autorises le BDE à
          les héberger, les afficher et les modérer dans le cadre du service. Le BDE peut masquer ou
          supprimer un contenu qui enfreint ces règles, sans préavis lorsque la sécurité ou la
          dignité des personnes l’exige.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilité et maintenance">
        <p>
          Le BDE s’efforce de maintenir la plateforme disponible, mais des interruptions peuvent
          survenir pour maintenance, mise à jour ou incident technique. Certains modules peuvent
          être désactivés selon les besoins de la communauté. L’état du service est publié sur la
          page{" "}
          <Link href="/statut" className="font-semibold text-brand-700 hover:underline">
            État du service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Trésorerie et paiements">
        <p>
          Les opérations de trésorerie sont réservées aux membres habilités. La plateforme conserve
          un journal des recettes et dépenses et permet de générer un reçu pour les recettes. Les
          paiements MVola et Airtel Money restent indisponibles tant que les accès marchands
          nécessaires ne sont pas fournis : la plateforme n’est pas un établissement de paiement et
          ne débite aucun compte étudiant.
        </p>
      </LegalSection>

      <LegalSection title="Élections">
        <p>
          Lorsqu’un scrutin est organisé, les règles de candidature, de vote et de dépouillement
          publiées par le BDE s’appliquent en complément. Le vote est secret : aucun lien entre un
          votant et un bulletin n’est conservé.
        </p>
      </LegalSection>

      <LegalSection title="Suspension et suppression">
        <p>
          Le BDE peut suspendre ou supprimer un compte en cas de violation de ces conditions, de
          comportement dangereux ou de tentative de fraude. Tu peux demander la suppression de ton
          compte via le formulaire de contact ; certaines données peuvent être conservées lorsque la
          loi ou la sécurité du scrutin l’imposent.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Ces conditions sont régies par le droit malgache. En cas de difficulté, contacte d’abord le
          BDE via le{" "}
          <Link href="/demandes/nouvelle" className="font-semibold text-brand-700 hover:underline">
            formulaire de demande
          </Link>{" "}
          afin de rechercher une solution amiable.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
