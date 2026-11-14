/**
 * Point d'entrée d'internationalisation.
 * L'interface est en français pour la livraison. Les libellés critiques sont
 * centralisés ici pour permettre l'ajout d'une autre locale sans réécrire l'UI.
 */
export const DEFAULT_LOCALE = "fr" as const;
export type Locale = "fr";

export const messages = {
  fr: {
    appName: "BDE",
    appTagline: "Plateforme officielle du Bureau des Étudiants",
    nav: {
      home: "Accueil",
      candidates: "Candidats",
      results: "Résultats",
      dashboard: "Mon espace",
      login: "Connexion",
      register: "S'inscrire",
      logout: "Déconnexion",
      admin: "Administration",
    },
    auth: {
      registerTitle: "Créer mon compte",
      loginTitle: "Se connecter",
      matricule: "Matricule",
      nom: "Nom de famille",
      identifiant: "Email ou téléphone",
      password: "Mot de passe",
    },
    errors: {
      generic: "Une erreur est survenue. Réessaie ou contacte le BDE.",
      network: "Connexion impossible. Vérifie ta connexion internet.",
    },
    vote: {
      title: "Élection du président du BDE",
      blank: "Vote blanc",
      confirm: "Confirmer mon vote",
      success: "Vote enregistré",
    },
  },
} as const;

export type MessageKey = typeof messages.fr;
export function getMessages(_locale: Locale = DEFAULT_LOCALE): MessageKey {
  return messages.fr;
}
