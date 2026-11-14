# Plateforme communautaire BDE

Application web officielle du Bureau des Étudiants : comptes vérifiés par matricule, annonces, événements, demandes, archives, communication, sondages, trésorerie et module électoral optionnel.

![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql)

## Sommaire

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Rôles et accès](#rôles-et-accès)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Données de démonstration](#données-de-démonstration)
- [Vérifications](#vérifications)
- [Sécurité](#sécurité)
- [Déploiement](#déploiement)
- [Documentation](#documentation)
- [Auteur](#auteur)

## Présentation

La plateforme centralise la vie du BDE dans un espace unique, officiel et durable. Elle remplace la dispersion entre groupes de messagerie, affiches, fichiers et bouche-à-oreille par trois espaces complémentaires :

| Espace | Usage |
| --- | --- |
| Site public | Découvrir le BDE, les annonces, le programme, les archives et les pages de confiance. |
| Espace étudiant | Compte vérifié, profil, notifications, demandes, inscriptions, communication et sondages. |
| Back-office BDE | Publier, modérer, gérer les comptes, les événements, la trésorerie et l'audit. |

Le projet est pensé mobile-first, en français, avec un thème clair et sombre, une PWA installable et un mode maintenance administrable.

## Fonctionnalités

### Site public

- Page d'accueil, annonces publiées, programme et archives.
- Pages de confiance : confidentialité, conditions d'usage, mentions légales et état du service.
- FAQ alimentée par les demandes traitées.
- Inscription et connexion des étudiants.

### Espace étudiant

- Inscription par matricule et nom de famille, avec validation manuelle optionnelle.
- Tableau de bord, profil et gestion de la sécurité du compte.
- Annonces ciblées par classe, commentaires et suivi de lecture.
- Programme : inscription aux événements, liste d'attente, export calendrier et QR de présence.
- Demandes : tickets, réponses du BDE, statut de traitement et FAQ.
- Archives : albums photos, documents officiels et signalements.
- Communication : canaux de discussion, réponses, réactions et modération.
- Sondages rapides, distincts du module électoral officiel.
- Notifications dans l'application.

### Back-office BDE

- Tableau de bord, actions rapides et activité récente.
- Gestion des étudiants : matricules, classes, import CSV/XLSX et validation des comptes.
- Comptes et rôles : étudiant, membre BDE, trésorier, administrateur.
- Annonces, événements, présences, archives, documents, canaux, sondages et signalements.
- Trésorerie : recettes, dépenses, catégories, moyen de paiement, payeur, événement lié, solde et reçu PDF.
- Identité visuelle : nom, slogan et logo.
- Journal d'audit, modules activables et mode maintenance.

### Module électoral optionnel

- Candidatures par poste et validation par l'administration.
- Cycle de scrutin : brouillon, candidatures, ouverte, clôturée, publiée.
- Vote unique par élection, bulletins anonymes et résultats consolidés.
- Exports PDF et CSV.
- Le module peut rester désactivé : la plateforme reste utile toute l'année.

## Rôles et accès

| Rôle | Accès |
| --- | --- |
| Visiteur | Informations publiques et pages légales. |
| Étudiant | Espace personnel après vérification du matricule et du nom. |
| Membre BDE | Annonces, demandes, programme, archives, communication, sondages et signalements. |
| Trésorier | Accès membre BDE, plus la trésorerie et les reçus PDF. |
| Administrateur | Tous les accès, dont comptes, rôles, élections, audit, identité, modules et trésorerie. |

La case « Trésorerie » est attribuée par un administrateur dans **Comptes et rôles**. Elle est retirée automatiquement si le compte redevient étudiant ou passe administrateur.

## Stack technique

| Domaine | Technologies |
| --- | --- |
| Application | Next.js 15.5, React 19, TypeScript, App Router |
| Interface | Tailwind CSS 3, thème clair/sombre, PWA |
| Données | PostgreSQL 18, Prisma 6 |
| Authentification | JWT `jose`, cookies httpOnly, `bcryptjs` |
| Validation | Zod |
| Fichiers | Stockage local ou S3 compatible, liens signés, `sharp` |
| Exports | `pdf-lib`, `exceljs` |
| Tests | Vitest, Playwright |
| Base locale | PostgreSQL embarqué via `embedded-postgres` |

## Architecture

```text
src/app                 Pages, layouts et routes API Next.js
src/app/(site)          Site public et espace étudiant
src/app/admin           Back-office BDE
src/app/api             Route handlers REST
src/components          Interface publique, authentification et administration
src/lib                 Sécurité, validation, stockage, exports et utilitaires
src/server/services     Logique métier et accès Prisma
prisma                  Schéma, migrations et données de référence
scripts                 Lancement local, seeds et test de charge
docs                    Documentation et fiches PDF
data                    CSV local ignoré par Git, avec un exemple versionné
```

Principes appliqués :

- Séparation entre pages, routes API, services métier et accès aux données.
- Vérification du rôle côté middleware, puis nouveau contrôle en base dans les pages sensibles.
- Validation systématique des entrées avec Zod.
- Réponses API normalisées et messages d'erreur contrôlés.
- Journal d'audit pour les actions sensibles.
- Stockage de fichiers abstrait : local en développement, S3 en production si nécessaire.

## Démarrage rapide

### Windows

Prérequis : Windows 10/11 x64 et Node.js 20 ou plus récent.

1. Vérifier `.env` ou copier `.env.example` vers `.env`.
2. Renseigner au minimum `AUTH_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`.
3. Double-cliquer sur `Lancer-BDE.cmd`.
4. Ouvrir `http://localhost:3000`.

Le lanceur installe les dépendances si nécessaire, démarre PostgreSQL embarqué sur le port `5433`, applique le schéma, crée l'administrateur, compile l'application et la démarre.

Pour arrêter proprement : `Ctrl+C`, fermeture de la fenêtre ou double-clic sur `Arreter-BDE.cmd`.

### Installation manuelle

```powershell
npm ci
Copy-Item .env.example .env
npm run db:dev
```

Dans un second terminal :

```powershell
npm run db:push
npm run seed:admin
npm run dev
```

L'administration est disponible sur `/admin`, la connexion sur `/connexion`.

## Variables d'environnement

Le modèle complet est dans [`.env.example`](.env.example). Variables principales :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL. |
| `AUTH_SECRET` | Signature des sessions, 32 caractères minimum. |
| `ADMIN_EMAIL` | Email du compte administrateur initial. |
| `ADMIN_PASSWORD` | Mot de passe administrateur fort. |
| `NEXT_PUBLIC_APP_URL` | URL publique HTTPS en production. |
| `S3_BUCKET` | Bucket S3 compatible, optionnel. |
| `S3_ACCESS_KEY_ID` | Clé S3, optionnelle. |
| `S3_SECRET_ACCESS_KEY` | Secret S3, optionnel. |
| `FILE_SIGNING_SECRET` | Secret des liens fichiers, `AUTH_SECRET` sinon. |
| `RESEND_API_KEY` | Envoi d'emails, optionnel. |
| `MAIL_FROM` | Expéditeur des emails, optionnel. |

Ne jamais publier `.env`, `.data`, `data/etudiants_bde.csv` ou les fichiers étudiants réels.

## Données de démonstration

Le fichier [`data/etudiants_bde.example.csv`](data/etudiants_bde.example.csv) contient trois lignes fictives permettant de tester l'import.

Pour utiliser une vraie liste :

```powershell
Copy-Item data/etudiants_bde.example.csv data/etudiants_bde.csv
npm run seed:students
```

Le fichier réel `data/etudiants_bde.csv` est ignoré par Git. Le seed est idempotent et n'écrase pas les comptes déjà réclamés.

## Vérifications

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

Tests e2e :

```powershell
$env:E2E_ALLOW='1'
npm run test:e2e
```

Test de charge, uniquement contre une base locale :

```powershell
$env:LOAD_TEST_ALLOW='1'
npm run loadtest
```

## Sécurité

- Mots de passe hachés avec bcrypt.
- Sessions JWT HS256 de 12 heures dans un cookie httpOnly, SameSite Lax.
- Protection CSRF par double soumission cookie/header et vérification de l'origine.
- Limitation des tentatives de connexion, d'inscription et de vote.
- Contrôle d'accès par rôle, avec vérification en base dans les pages sensibles.
- Validation des entrées avec Zod et réponses API sans données sensibles.
- En-têtes CSP, HSTS, anti-clickjacking et `nosniff`.
- Fichiers servis par liens signés et vérification du type réel.
- Vote confidentiel : participation et bulletin séparés, sans lien vers le votant.
- Journal d'audit consultable uniquement par l'administration.

## Déploiement

Le guide détaillé Vercel et Hostinger est disponible dans [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).

Cible recommandée : VPS ou plateforme Node.js avec disque persistant, PostgreSQL managé et HTTPS.

1. Créer une base PostgreSQL et conserver son URL avec SSL.
2. Configurer `.env` avec des secrets de production et une URL HTTPS.
3. Installer, migrer et compiler :

```powershell
npm ci
npx prisma migrate deploy
npm run build
npm start
```

4. Lancer les seeds nécessaires :

```powershell
npm run seed:admin
npm run seed:students
```

5. Vérifier `https://DOMAINE/api/health`.
6. Vérifier la connexion admin, les cookies `Secure`, les en-têtes de sécurité et l'envoi de fichiers.
7. Sauvegarder régulièrement la base et `.data/uploads`, ou le bucket S3.

Sans disque persistant, configurer S3 pour les fichiers. Le mode production doit toujours utiliser HTTPS.

## Documentation

- [Fiche technique PDF](docs/Fiche-technique-BDE.pdf) : présentation, technologies, architecture, fonctionnalités, rôle et réalisations.
- [Brief fonctionnel PDF](docs/Brief-fonctionnalites-BDE.pdf) : synthèse pour présenter le projet.
- [Guide de déploiement](docs/DEPLOIEMENT.md) : Vercel, Hostinger et VPS.
- [Checklist élection](docs/CHECKLIST-ELECTION.md) : procédure du module électoral optionnel.
- [Captures d'écran](docs/captures/README.md) : conventions et captures recommandées.

Pour régénérer la fiche technique après avoir ajouté les captures ou renseigné les liens :

```powershell
npm run docs:tech
```

## Auteur

Conçu et développé par **Tojo Nambinina RANDRIAMIFALY**.

WhatsApp : [038 77 299 58](https://wa.me/261387729958)

Projet privé — tous droits réservés.
