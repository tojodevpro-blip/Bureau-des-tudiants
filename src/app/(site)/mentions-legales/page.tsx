import Link from "next/link";
import { FileText } from "lucide-react";
import { LegalPage, LegalSection } from "@/components/site/legal-page";

export const metadata = { title: "Mentions légales" };

export default function LegalNoticePage() {
  return (
    <LegalPage
      eyebrow="Informations légales"
      title="Mentions légales"
      intro="Informations relatives à l’édition et à l’hébergement de la plateforme communautaire du BDE."
      updatedAt="11 novembre 2026"
      icon={FileText}
    >
      <LegalSection title="Éditeur">
        <p>
          La plateforme est éditée par le Bureau des Étudiants (BDE), représenté par son bureau. Le
          BDE est une organisation étudiante de l’établissement, sans but lucratif.
        </p>
        <p>
          Contact :{" "}
          <Link href="/demandes/nouvelle" className="font-semibold text-brand-700 hover:underline">
            formulaire de demande
          </Link>
          . Les coordonnées postales et l’adresse de contact officielle sont communiquées par le BDE
          lors de la mise en ligne.
        </p>
      </LegalSection>

      <LegalSection title="Responsable de la publication">
        <p>
          Le responsable de la publication est le président ou la présidente du BDE en exercice, ou
          la personne désignée par le bureau pour administrer la plateforme.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          L’hébergement est assuré par le prestataire technique retenu par le BDE lors de la mise en
          production, notamment Vercel Inc. pour un déploiement Vercel ou Hostinger International
          Ltd pour un déploiement Hostinger. Les coordonnées exactes de l’hébergeur et du serveur
          utilisé peuvent être obtenues auprès du BDE.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les éléments propres à la plateforme (interface, textes, identité visuelle et code) sont
          utilisés par le BDE pour son fonctionnement. Les contenus publiés par les étudiants
          restent la propriété de leurs auteurs, qui autorisent leur affichage dans le cadre du
          service.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement des données est décrit dans la{" "}
          <Link href="/confidentialite" className="font-semibold text-brand-700 hover:underline">
            politique de confidentialité
          </Link>
          . Pour exercer tes droits, utilise le formulaire de demande.
        </p>
      </LegalSection>

      <LegalSection title="Signalement">
        <p>
          Pour signaler un contenu illicite, un comportement dangereux ou un problème de sécurité,
          contacte le BDE via le formulaire de demande en décrivant précisément les faits et, si
          possible, l’adresse de la page concernée.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
