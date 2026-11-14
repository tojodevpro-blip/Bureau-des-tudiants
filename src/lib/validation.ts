import { z } from "zod";
import { parseLocalDateTime } from "@/lib/utils";

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe ne peut pas dépasser 72 caractères.");

export const registerSchema = z.object({
  matricule: z
    .string()
    .trim()
    .min(3, "Saisis ton matricule.")
    .max(30, "Matricule trop long."),
  nom: z
    .string()
    .trim()
    .min(2, "Saisis ton nom de famille.")
    .max(120, "Nom trop long."),
  identifiant: z
    .string()
    .trim()
    .min(3, "Saisis un email ou un numéro de téléphone.")
    .max(160, "Identifiant trop long."),
  motDePasse: passwordSchema,
});

export const loginSchema = z.object({
  identifiant: z.string().trim().min(3, "Saisis ton email ou téléphone.").max(160),
  motDePasse: z.string().min(1, "Saisis ton mot de passe.").max(72),
});

export const voteChoiceSchema = z.object({
  positionId: z.string().min(1, "Poste manquant.").max(60),
  candidateId: z.string().min(1).max(60).nullable(),
});

export const voteSchema = z
  .object({
    electionId: z.string().min(1, "Élection manquante.").max(60),
    candidateId: z.string().min(1).max(60).nullable().optional(),
    choices: z.array(voteChoiceSchema).min(1).max(50).optional(),
  })
  .refine((value) => value.choices !== undefined || value.candidateId !== undefined, {
    message: "Choisis un candidat ou un bulletin par poste.",
    path: ["candidateId"],
  });

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || /^https?:\/\//i.test(value),
    "L'URL de la photo doit commencer par http:// ou https://.",
  );

const dateInput = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? parseLocalDateTime(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "Date invalide.");

export const studentCreateSchema = z.object({
  matricule: z.string().trim().min(3, "Matricule requis.").max(30),
  nom: z.string().trim().min(2, "Nom requis.").max(120),
  prenoms: z.string().trim().min(1, "Prénoms requis.").max(160),
  classe: z.string().trim().min(1, "Classe requise.").max(80),
  noteVerification: z.string().trim().max(300).optional().nullable(),
  actif: z.boolean().optional(),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  noteVerification: z.string().trim().max(300).optional().nullable(),
  actif: z.boolean().optional(),
});

export const importRowSchema = z.object({
  matricule: z.string().trim().min(1).max(30),
  nom: z.string().trim().min(1).max(120),
  prenoms: z.string().trim().min(1).max(160),
  classe: z.string().trim().min(1).max(80),
  aVerifier: z.string().trim().max(300).optional().nullable(),
});

export const importCommitSchema = z.object({
  rows: z.array(importRowSchema).min(1, "Aucune ligne à importer.").max(2000),
});

export const electionCreateSchema = z.object({
  titre: z.string().trim().min(3, "Titre requis.").max(160),
  description: z.string().trim().max(5000).optional().nullable(),
  ouvreLe: dateInput,
  fermeLe: dateInput,
});

export const electionUpdateSchema = electionCreateSchema.partial();

export const candidateSchema = z.object({
  nomAffiche: z.string().trim().min(2, "Nom affiché requis.").max(160),
  photoUrl: optionalUrl,
  slogan: z.string().trim().max(200).optional().nullable(),
  programme: z.string().trim().max(10000).optional().nullable(),
  ordre: z.coerce.number().int().min(0).max(999).optional(),
  studentId: z.string().trim().max(60).optional().nullable(),
  positionId: z.string().trim().max(60).optional().nullable(),
});

export const candidateUpdateSchema = candidateSchema.partial();

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1).max(60)).min(1).max(100),
});

export const electionStatusSchema = z.object({
  statut: z.enum(["BROUILLON", "CANDIDATURES", "OUVERTE", "CLOTUREE", "PUBLIEE"]),
});

export const userStatusSchema = z.object({
  statut: z.enum(["APPROUVE", "REJETE"]),
});

export const settingsSchema = z.object({
  validationManuelleInscriptions: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  identifiant: z.string().trim().min(3, "Saisis ton email ou téléphone.").max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  motDePasse: passwordSchema,
});

export const profileSchema = z.object({
  prenoms: z.string().trim().min(1, "Prénoms requis.").max(160),
  nom: z.string().trim().min(2, "Nom requis.").max(120),
  classe: z.string().trim().min(1, "Classe requise.").max(80),
  photoUrl: optionalUrl,
  notificationsEmail: z.boolean(),
  consentementPhotos: z.boolean(),
});

export const identitySchema = z.object({
  nom: z.string().trim().min(2, "Le nom de l'association est requis.").max(80),
  nomCourt: z.string().trim().min(1, "Le nom court est requis.").max(16),
  slogan: z.string().trim().max(140),
  logoUrl: optionalUrl,
});

export const passwordChangeSchema = z.object({
  motDePasseActuel: z.string().min(1, "Saisis ton mot de passe actuel.").max(72),
  nouveauMotDePasse: passwordSchema,
});

export const accountDeleteSchema = z.object({
  motDePasse: z.string().min(1, "Confirme avec ton mot de passe.").max(72),
  confirmation: z.literal("SUPPRIMER"),
});

export const reportSchema = z.object({
  targetType: z.enum(["ANNONCE", "COMMENTAIRE", "MESSAGE", "PHOTO", "DEMANDE", "EVENEMENT"]),
  targetId: z.string().min(1).max(80),
  motif: z.string().trim().min(3, "Indique un motif.").max(160),
  details: z.string().trim().max(2000).optional().nullable(),
});

export const roleUpdateSchema = z.object({
  role: z.enum(["STUDENT", "MEMBRE_BDE", "ADMIN"]),
  tresorerieAccess: z.boolean().optional(),
});

const treasuryDateInput = z
  .string()
  .trim()
  .min(1, "La date est requise.")
  .transform((value) => (value.length === 10 ? new Date(`${value}T00:00:00+03:00`) : new Date(value)))
  .refine((value) => !Number.isNaN(value.getTime()), "Date invalide.");

export const treasuryEntrySchema = z.object({
  type: z.enum(["RECETTE", "DEPENSE"]),
  libelle: z.string().trim().min(2, "Libellé requis.").max(180),
  categorie: z.string().trim().min(2, "Catégorie requise.").max(80),
  montant: z.coerce
    .number()
    .int("Le montant doit être un nombre entier.")
    .min(1, "Le montant doit être positif.")
    .max(1_000_000_000, "Montant trop élevé."),
  date: treasuryDateInput,
  moyenPaiement: z.enum(["ESPECES", "MVOLA", "AIRTEL_MONEY", "VIREMENT", "AUTRE"]),
  reference: z.string().trim().max(160).optional().nullable(),
  payeur: z.string().trim().max(160).optional().nullable(),
  note: z.string().trim().max(2000).optional().nullable(),
  eventId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((value) => value || null),
});

export const treasuryEntryUpdateSchema = treasuryEntrySchema.partial();

export const modulesUpdateSchema = z.object({
  modules: z.array(z.enum(["annonces", "demandes", "programme", "archives", "communication", "sondages", "candidatures"])),
});

export const maintenanceSchema = z.object({
  actif: z.boolean(),
  message: z.string().trim().max(500).optional(),
});

export const commentSchema = z.object({
  targetType: z.enum(["ANNONCE", "EVENEMENT"]),
  targetId: z.string().min(1).max(80),
  contenu: z.string().trim().min(1, "Écris un commentaire.").max(2000),
});

export const announcementSchema = z.object({
  titre: z.string().trim().min(3, "Titre requis.").max(180),
  contenu: z.string().trim().min(3, "Contenu requis.").max(20000),
  categorie: z.string().trim().min(2, "Catégorie requise.").max(60),
  imageUrl: optionalUrl,
  cibleToutes: z.boolean(),
  classes: z.array(z.string().trim().min(1).max(80)).max(50),
  epingle: z.boolean(),
  urgent: z.boolean(),
  publieLe: dateInput,
  expireLe: dateInput,
  statut: z.enum(["BROUILLON", "PUBLIEE", "ARCHIVEE"]),
});

export const announcementUpdateSchema = announcementSchema.partial();

export const supportRequestSchema = z.object({
  categorie: z.string().trim().min(2, "Choisis une catégorie.").max(60),
  sujet: z.string().trim().min(3, "Sujet requis.").max(180),
  message: z.string().trim().min(10, "Décris ta demande en quelques mots.").max(5000),
  anonyme: z.boolean(),
});

export const supportReplySchema = z.object({
  contenu: z.string().trim().min(1, "Écris une réponse.").max(5000),
  interne: z.boolean().optional(),
  templateId: z.string().max(80).optional().nullable(),
});

export const eventSchema = z.object({
  titre: z.string().trim().min(3, "Titre requis.").max(180),
  description: z.string().trim().min(10, "Description requise.").max(10000),
  lieu: z.string().trim().min(2, "Lieu requis.").max(200),
  debut: dateInput,
  fin: dateInput,
  visuelUrl: optionalUrl,
  categorie: z.string().trim().min(2, "Catégorie requise.").max(60),
  capacite: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  prixModalites: z.string().trim().max(500).optional().nullable(),
});

export const albumSchema = z.object({
  titre: z.string().trim().min(2, "Titre requis.").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  annee: z.coerce.number().int().min(2000).max(2100),
  eventId: z.string().max(80).optional().nullable(),
});

export const documentSchema = z.object({
  titre: z.string().trim().min(2, "Titre requis.").max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  categorie: z.string().trim().min(2, "Catégorie requise.").max(60),
  dateDocument: dateInput,
});

export const channelSchema = z.object({
  nom: z.string().trim().min(2, "Nom requis.").max(80),
  type: z.enum(["GENERAL", "CLASSE", "ADMIN", "ANNONCES"]).default("ADMIN"),
  classe: z.string().trim().max(80).optional().nullable(),
  readOnly: z.boolean().optional(),
});

export const messageSchema = z.object({
  contenu: z.string().trim().max(3000).optional().nullable(),
  replyToId: z.string().max(80).optional().nullable(),
});

export const pollSchema = z.object({
  question: z.string().trim().min(5, "Question requise.").max(240),
  description: z.string().trim().max(2000).optional().nullable(),
  multiple: z.boolean(),
  anonyme: z.boolean(),
  resultatsMode: z.enum(["IMMEDIAT", "APRES_CLOTURE"]),
  closesAt: dateInput,
  audienceToutes: z.boolean(),
  classes: z.array(z.string().trim().min(1).max(80)).max(50),
  options: z.array(z.string().trim().min(1, "Option vide.").max(160)).min(2, "Ajoute au moins deux options.").max(12),
});

export const pollVoteSchema = z.object({
  optionIds: z.array(z.string().min(1).max(80)).min(1, "Choisis une option.").max(12),
});

export const candidatureSchema = z.object({
  positionId: z.string().min(1, "Choisis un poste.").max(80),
  photoUrl: optionalUrl,
  slogan: z.string().trim().max(200).optional().nullable(),
  programme: z.string().trim().min(20, "Présente ton programme.").max(10000),
  videoUrl: optionalUrl,
});

export const candidatureReviewSchema = z.object({
  statut: z.enum(["VALIDEE", "REFUSEE"]),
  motif: z.string().trim().max(500).optional().nullable(),
});

export const positionSchema = z.object({
  titre: z.string().trim().min(2, "Titre du poste requis.").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  ordre: z.coerce.number().int().min(0).max(99).optional(),
});

export const requestStatusSchema = z.object({
  statut: z.enum(["OUVERTE", "EN_COURS", "RESOLUE", "FERMEE"]),
});

export const faqSchema = z.object({
  publiee: z.boolean(),
});

export const templateSchema = z.object({
  titre: z.string().trim().min(2, "Titre requis.").max(160),
  contenu: z.string().trim().min(5, "Contenu requis.").max(5000),
});

export const eventUpdateSchema = eventSchema.partial();

export const checkinSchema = z.object({
  token: z.string().trim().min(10, "Billet invalide.").max(200),
});

export const pollStatusSchema = z.object({
  statut: z.enum(["BROUILLON", "OUVERT", "CLOTURE"]),
});

export const mediaMaskSchema = z.object({
  masque: z.boolean(),
  motif: z.string().trim().max(300).optional().nullable(),
});

export const reactionSchema = z.object({
  emoji: z.enum(["👍", "❤️", "😂", "🎉", "👏"]),
});

export const muteSchema = z.object({
  email: z.string().trim().email("Email invalide.").max(160),
  motif: z.string().trim().min(3, "Motif requis.").max(300),
  jusquAu: dateInput,
});
