# Checklist élection BDE

À imprimer ou garder ouvert le jour du scrutin.

## J-7 — Préparation

- [ ] Base PostgreSQL de production créée et accessible en HTTPS.
- [ ] `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL` définis dans l’hébergeur.
- [ ] `npm run typecheck`, `npm test` et `npm run build` passent.
- [ ] `npm run seed:admin` exécuté avec un mot de passe fort et unique.
- [ ] Liste des étudiants complétée et importée.
- [ ] Chaque ligne « à vérifier » contrôlée manuellement.
- [ ] Aucun doublon de matricule.
- [ ] Les comptes en attente sont approuvés ou rejetés.
- [ ] Un étudiant de test peut s’inscrire et se connecter.
- [ ] Un accès étudiant à `/admin` est refusé.

## J-2 — Sauvegarde et test à blanc

- [ ] Sauvegarde complète effectuée :
  - Neon/Supabase : snapshot ou export fourni par le tableau de bord.
  - PostgreSQL local : `pg_dump "$env:DATABASE_URL" --format=custom --file="bde-avant-vote.dump"`.
- [ ] La sauvegarde a été restaurée une fois sur une base de test.
- [ ] Une élection factice est créée avec au moins deux candidats.
- [ ] Le vote est ouvert, un vote de test est déposé, le second vote est refusé.
- [ ] La clôture, les exports PDF/CSV et la publication sont vérifiés.
- [ ] L’élection factice est supprimée ou clairement identifiée comme test.
- [ ] Le test de charge local a été exécuté (300 votes) ou une répétition de vote a été faite.
- [ ] Le fuseau affiché est bien celui de Madagascar (UTC+3).

## Jour J — Avant l’ouverture

- [ ] Dernière sauvegarde effectuée.
- [ ] Liste des matricules figée : plus d’import ni de suppression.
- [ ] Vérifier qu’aucune autre élection n’est `OUVERTE`.
- [ ] Vérifier les candidats, photos, slogans et programmes.
- [ ] Vérifier l’heure d’ouverture et de fermeture.
- [ ] Prévenir les étudiants de l’URL et de la procédure.
- [ ] Ouvrir le vote depuis `/admin/elections/[id]` et confirmer.
- [ ] Vérifier que `/candidats` et `/vote` sont accessibles aux étudiants approuvés.
- [ ] Vérifier qu’un compte non approuvé ne peut pas voter.
- [ ] Noter l’heure exacte d’ouverture.

## Pendant le scrutin

- [ ] Surveiller la participation sur `/admin/elections/[id]`.
- [ ] Ne jamais afficher les résultats par candidat avant la clôture.
- [ ] Surveiller `/admin/audit` : échecs de connexion anormaux, votes rejetés, erreurs.
- [ ] Vérifier que le nombre de votants ne dépasse pas le nombre d’inscrits.
- [ ] Conserver une sauvegarde intermédiaire si la participation est élevée.
- [ ] Noter tout incident et l’heure.

## Clôture

- [ ] Clôturer le vote depuis l’administration avec confirmation.
- [ ] Vérifier l’heure de clôture et le statut `CLOTUREE`.
- [ ] Vérifier qu’un nouvel essai de vote est refusé.
- [ ] Télécharger le procès-verbal PDF.
- [ ] Télécharger l’export CSV.
- [ ] Effectuer une sauvegarde **après** la clôture.
- [ ] Faire valider les résultats par au moins deux membres du BDE.
- [ ] Publier les résultats.
- [ ] Vérifier `/resultats` en navigation privée.

## Après le scrutin

- [ ] Archiver PDF, CSV, sauvegarde et journal d’audit.
- [ ] Conserver les fichiers dans un espace d’accès restreint.
- [ ] Vérifier la cohérence : votants = participations = bulletins.
- [ ] Documenter les incidents et les écarts éventuels.
- [ ] Désactiver ou archiver l’élection si l’application reste en ligne.
- [ ] Faire un retour d’expérience pour la prochaine élection.

## En cas d’incident

- Base indisponible : restaurer la dernière sauvegarde sur une base de secours et vérifier les données.
- Vote impossible : vérifier le statut `OUVERTE`, les dates et le fuseau, puis le compte étudiant.
- Double vote signalé : la contrainte de base doit l’avoir refusé ; vérifier les participations, pas les bulletins.
- Résultats incohérents : ne pas publier, comparer participations et bulletins, restaurer une sauvegarde si nécessaire.
- Accès admin suspect : changer le mot de passe admin, invalider les sessions en rotation de `AUTH_SECRET`, consulter le journal.
