# Guide de déploiement

Ce projet peut être hébergé de deux façons principales :

- **Vercel** : simple et rapide, mais il faut une base PostgreSQL managée et un stockage S3 compatible.
- **Hostinger** : hébergement Node.js managé ou VPS. Le VPS est la seule option Hostinger qui permet de garder PostgreSQL et les fichiers sur la même machine.

Dans les deux cas, l’application doit être servie en **HTTPS**. Le scan caméra du QR de présence et les cookies sécurisés en dépendent.

## Préparation commune

Générer les secrets de production :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Variables minimales à définir :

| Variable | Valeur en production |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL avec SSL |
| `AUTH_SECRET` | Secret aléatoire de 32 caractères minimum |
| `ADMIN_EMAIL` | Email du premier administrateur |
| `ADMIN_PASSWORD` | Mot de passe fort, 12 caractères minimum |
| `ADMIN_NOM` | Nom affiché de l’administrateur |
| `NEXT_PUBLIC_APP_URL` | `https://votre-domaine` |
| `S3_*` | Bucket compatible S3 si l’hébergeur n’a pas de disque persistant |
| `RESEND_API_KEY`, `MAIL_FROM` | Facultatif, pour les emails |

Créer les tables et le compte administrateur **une seule fois**, avec l’URL de la base de production :

```powershell
$env:DATABASE_URL="postgresql://.../bde?sslmode=require"
npx prisma migrate deploy
npm run seed:admin
```

Le seed des étudiants est facultatif et idempotent :

```powershell
npm run seed:students
```

Ne jamais lancer `prisma migrate dev` contre la production : cette commande peut réinitialiser la base. Utiliser uniquement `prisma migrate deploy`.

---

## Option 1 — Vercel

### Prérequis

1. Un compte Vercel et un dépôt Git.
2. Une base PostgreSQL managée : Neon, Supabase, Prisma Postgres ou équivalent.
3. Un bucket S3 compatible : Cloudflare R2, AWS S3, Backblaze B2, Scaleway, etc.

### Pourquoi S3 est obligatoire

Le système de fichiers de Vercel n’est pas persistant. Sans S3, les logos, photos et documents écrits dans `.data/uploads` seront perdus au redéploiement ou au redémarrage des fonctions.

### Étapes

1. **Créer la base** et récupérer deux URLs :
   - une URL **poolée** pour l’application (`DATABASE_URL`) ;
   - une URL **directe** pour les migrations. Le schéma Prisma n’utilise qu’une seule `DATABASE_URL` : lance les migrations depuis ta machine avec l’URL directe, puis mets l’URL poolée dans Vercel.

2. **Créer le bucket S3** et un utilisateur limité à ce bucket. Renseigner dans Vercel :
   - `S3_BUCKET`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_REGION`
   - `S3_ENDPOINT` si le fournisseur n’est pas AWS
   - `S3_FORCE_PATH_STYLE=true` pour R2, MinIO ou certains fournisseurs

3. **Importer le dépôt dans Vercel**. Réglages :
   - Framework : Next.js
   - Install Command : `npm ci`
   - Build Command : `npm run build` (le script lance déjà `prisma generate`)
   - Output Directory : `.next`
   - Node.js : 20 ou plus récent

4. **Ajouter les variables** dans `Settings → Environment Variables` pour Production, Preview et Development. Utiliser `NEXT_PUBLIC_APP_URL=https://votre-domaine` pour la production.

5. **Appliquer les migrations avant le déploiement** depuis ta machine :

```powershell
$env:DATABASE_URL="postgresql://URL_DIRECTE/..."
npx prisma migrate deploy
```

6. **Déployer** par un push Git ou avec la CLI :

```powershell
npx vercel deploy --prod
```

7. **Créer l’admin** une fois, avec l’URL directe ou poolée de production :

```powershell
$env:DATABASE_URL="postgresql://.../bde?sslmode=require"
npm run seed:admin
```

8. **Vérifier** :
   - `https://votre-domaine/api/health` répond `{"status":"ok","database":"ok"}` ;
   - la connexion admin fonctionne ;
   - un logo ou une photo s’envoie et reste visible après un redéploiement ;
   - un reçu de trésorerie s’ouvre et se télécharge.

### Points d’attention Vercel

- Utiliser l’URL **poolée** pour `DATABASE_URL` afin d’éviter l’épuisement des connexions PostgreSQL avec les fonctions serverless.
- Les migrations ne sont pas lancées automatiquement par `next build`. Il faut les appliquer avant chaque déploiement qui contient une nouvelle migration.
- Choisir une région de fonctions proche de la base de données.
- Le plan gratuit peut mettre les fonctions en veille : la première requête peut être plus lente.
- Aucun cron ni worker permanent n’est configuré dans ce projet.

---

## Option 2 — Hostinger

### A. Hébergement Node.js managé

Hostinger propose Node.js sur les plans Business et Cloud. C’est l’option la plus simple si la base reste externe.

1. Choisir un plan avec Node.js et créer un site Node.js.
2. Connecter le dépôt GitHub ou GitLab.
3. Régler :
   - Application type : `next`
   - Build script : `build` ou `npm run build`
   - Output directory : `.next`
   - Node.js : 20 ou plus récent
4. Créer une base PostgreSQL externe (Supabase par exemple) et renseigner `DATABASE_URL`.
5. Ajouter les variables d’environnement, dont `NEXT_PUBLIC_APP_URL=https://votre-domaine`.
6. Configurer un bucket S3 compatible pour les fichiers si le stockage du plan n’est pas garanti persistant.
7. Appliquer les migrations depuis ta machine avec l’URL directe de la base :

```powershell
$env:DATABASE_URL="postgresql://.../bde?sslmode=require"
npx prisma migrate deploy
```

8. Déployer, puis créer l’admin avec `npm run seed:admin` en pointant vers la base de production.
9. Vérifier `/api/health`, la connexion et l’envoi d’un fichier.

Hostinger applique automatiquement `output: "standalone"` aux applications Next.js et démarre le serveur généré. Ce mode convient à un déploiement Git sans accès SSH.

### B. VPS Hostinger (recommandé pour PostgreSQL local)

Cette option garde l’application, PostgreSQL et les fichiers sur la même machine. Elle demande plus d’administration.

#### Dimensionnement

- **KVM 1** : suffisant pour un petit site sans base locale.
- **KVM 2** : recommandé si PostgreSQL tourne sur le même VPS.

#### Installation

Sur Ubuntu 24.04 LTS, en SSH :

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw
node -v
```

Créer la base et l’utilisateur PostgreSQL :

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE bde;
CREATE USER bde_user WITH ENCRYPTED PASSWORD 'mot-de-passe-fort';
ALTER ROLE bde_user SET client_encoding TO 'utf8';
ALTER ROLE bde_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE bde_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE bde TO bde_user;
\c bde
GRANT ALL ON SCHEMA public TO bde_user;
\q
```

Installer l’application :

```bash
sudo mkdir -p /var/www/bde
sudo chown $USER:$USER /var/www/bde
git clone VOTRE_DEPOT /var/www/bde
cd /var/www/bde
npm ci
```

Créer `/var/www/bde/.env` avec les variables de production. Exemple :

```dotenv
DATABASE_URL="postgresql://bde_user:mot-de-passe-fort@localhost:5432/bde?schema=public"
AUTH_SECRET="secret-aleatoire-de-32-caracteres-minimum"
ADMIN_EMAIL="admin@votre-domaine"
ADMIN_PASSWORD="mot-de-passe-admin-fort"
ADMIN_NOM="Administrateur BDE"
NEXT_PUBLIC_APP_URL="https://votre-domaine"
```

Sans S3, les fichiers restent dans `.data/uploads`. Ce dossier doit être conservé et sauvegardé.

Appliquer les migrations, compiler et démarrer :

```bash
npx prisma migrate deploy
npm run build
sudo npm install -g pm2
pm2 start npm --name "bde" -- start
pm2 save
pm2 startup
```

Exécuter la dernière ligne affichée par `pm2 startup`, puis vérifier :

```bash
pm2 status
curl http://127.0.0.1:3000/api/health
```

Créer l’admin :

```bash
npm run seed:admin
```

#### Nginx et HTTPS

Créer `/etc/nginx/sites-available/bde` :

```nginx
server {
    listen 80;
    server_name votre-domaine;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Activer le site et obtenir le certificat :

```bash
sudo ln -s /etc/nginx/sites-available/bde /etc/nginx/sites-enabled/bde
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d votre-domaine
```

Chemin DNS : créer un enregistrement `A` chez Hostinger vers l’IP du VPS.

Pare-feu :

```bash
sudo ufw allow OpenSSH
sudo ufw allow "Nginx Full"
sudo ufw enable
```

Le port `3000` ne doit pas être exposé publiquement : Nginx fait le relais.

#### Mises à jour et sauvegardes

```bash
cd /var/www/bde
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart bde
```

Sauvegarder la base :

```bash
pg_dump -U bde_user -h localhost bde > /var/backups/bde-$(date +%F).sql
```

Sauvegarder les fichiers :

```bash
tar -czf /var/backups/bde-uploads-$(date +%F).tar.gz /var/www/bde/.data/uploads
```

Copier régulièrement ces archives hors du VPS. Tester une restauration avant d’en avoir besoin.

---

## Vérifications après mise en ligne

1. `https://votre-domaine/api/health` répond `ok`.
2. La page `/statut` affiche la base comme opérationnelle.
3. La connexion admin fonctionne et les cookies sont sécurisés.
4. Un étudiant peut se connecter, consulter les annonces et envoyer une demande.
5. Le scan caméra fonctionne en HTTPS.
6. Un fichier envoyé reste accessible après redémarrage ou redéploiement.
7. Une recette de trésorerie produit un reçu PDF lisible et téléchargeable.
8. Les sauvegardes de la base et des fichiers sont planifiées.

## Limites connues

- MVola et Airtel Money restent des placeholders : aucune API marchand réelle n’est intégrée.
- Sans S3, un hébergement sans disque persistant perdra les fichiers téléversés.
- Vercel ne fournit ni PostgreSQL ni stockage persistant : ces services doivent être choisis séparément.
- Un VPS Hostinger est auto-géré : mises à jour système, sauvegardes et supervision restent à la charge du BDE.
