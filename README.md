# StockFlow — Inventory Management with signed QR codes

Production-style inventory platform built on **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Drizzle ORM + PostgreSQL**.

## Demo accounts (password `Password123!`)

| Role | Email |
| --- | --- |
| Administrator | admin@stockflow.io |
| Inventory Manager | manager@stockflow.io |
| Employee | employee@stockflow.io |
| Auditor (read-only) | auditor@stockflow.io |

## Architecture

```
src/
  app/
    (app)/            authenticated shell: dashboard, products, scanner, movements,
                      categories, suppliers, warehouses, reports, audit, settings
    login/            public auth screen
    api/              REST API (auth, products, categories, suppliers, warehouses,
                      movements, scan, qr, dashboard, reports, audit-logs,
                      notifications, search, health)
  components/         design system (ui.tsx), app shell, dialogs, providers
  db/                 Drizzle schema + seed script
  lib/                auth (JWT + sessions), qr (HMAC signing), api helpers,
                      zod validation, formatting utils
  server/             service/repository layer (products, movements)
  middleware.ts       route protection + security headers
```

## Security

- JWT access tokens (1h, `jose`, HttpOnly cookie) + rotating refresh tokens (30d) stored hashed (SHA-256) in the `sessions` table.
- bcrypt password hashing, RBAC guards (`requireRole`) on every mutating endpoint.
- Rate limiting on auth endpoints, security headers via middleware, Zod DTO validation, consistent error envelopes.
- Every mutation is written to `audit_logs` with before/after JSON, IP address and user agent.

## QR system

Each product carries a signed payload `{v, id, sku, wh, t, sig}` where `sig` is an HMAC-SHA256 checksum (`QR_SECRET`). `/api/scan` verifies integrity before returning a product; unsigned SKUs are still resolvable as a fallback. Labels can be downloaded as PNG (`/api/qr/:id?format=png`) or printed as a bulk sheet / PDF (`/api/qr/labels?ids=...`).

## Scripts

```bash
npx drizzle-kit push     # apply schema
npx tsx src/db/seed.ts   # seed realistic demo data
npm run build && npm start
```

---

# 🚀 Déploiement en local (pas à pas)

## Prérequis

- **Node.js 20+** (22 recommandé) et **npm**
- **PostgreSQL 14+** en local, **ou** Docker Desktop

Vérifier :

```bash
node -v
npm -v
psql --version   # si Postgres installé en natif
```

---

## Option A — Local « natif » (Node + PostgreSQL sur la machine)

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer la base de données

```bash
# macOS / Linux
createdb app_db

# ou via psql
psql -U postgres -c "CREATE DATABASE app_db;"
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Puis éditer `.env` :

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
JWT_SECRET=une-chaine-aleatoire-tres-longue
QR_SECRET=une-autre-chaine-aleatoire-tres-longue
```

Générer des secrets solides :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ `QR_SECRET` signe les QR codes : s'il change, les étiquettes déjà imprimées ne passeront plus la vérification d'intégrité (il faudra les réimprimer).

### 4. Créer le schéma (tables, enums, index)

```bash
npx drizzle-kit push
```

### 5. Injecter les données de démo

```bash
npx tsx src/db/seed.ts
```

Sortie attendue :

```
Resetting tables…
  4 users
  40 products
  310 stock movements
Seed complete. Login with admin@stockflow.io / Password123!
```

> ⚠️ Le seed fait un `TRUNCATE … CASCADE` : il efface toutes les données existantes.

### 6. Lancer l'application

**Mode développement (hot reload) :**

```bash
npm run dev
```

**Mode production (identique au déploiement) :**

```bash
npm run build
npm start
```

Ouvrir 👉 **http://localhost:3000** et se connecter avec `admin@stockflow.io` / `Password123!`.

Vérification santé : `curl http://localhost:3000/api/health` → `{"ok":true}`

---

## Option B — Tout en Docker (application + base)

```bash
docker compose up --build -d
```

Cela démarre :

- `stockflow-db` → PostgreSQL 16 sur le port **5432** (volume persistant)
- `stockflow-app` → l'application Next.js sur le port **3000**

Puis appliquer le schéma et le seed **une seule fois** :

```bash
docker compose exec app npx drizzle-kit push
docker compose exec app npx tsx src/db/seed.ts
```

Commandes utiles :

```bash
docker compose logs -f app     # suivre les logs
docker compose down            # arrêter
docker compose down -v         # arrêter + supprimer les données
```

---

## Option C — Base en Docker, application en local

Idéal pour développer avec hot reload sans installer Postgres :

```bash
docker compose up -d db
cp .env.example .env
npx drizzle-kit push
npx tsx src/db/seed.ts
npm run dev
```

---

## 📷 Tester le scanner QR en local

Les navigateurs n'autorisent l'accès à la caméra **que** sur `https://` ou sur `http://localhost`.

- **Sur l'ordinateur** : `http://localhost:3000/scanner` fonctionne directement (webcam).
- **Sur un smartphone** (même Wi-Fi) : `http://192.168.x.x:3000` sera **bloqué** par le navigateur. Deux solutions :

```bash
# 1) Tunnel HTTPS instantané
npx localtunnel --port 3000
# ou
ngrok http 3000
```

```bash
# 2) HTTPS local via certificat auto-signé
npx next dev --experimental-https
```

Un champ **saisie manuelle** est disponible sur la page Scanner (SKU ou payload QR) pour tester sans caméra.

Pour imprimer des étiquettes de test : `http://localhost:3000/api/qr/labels` (feuille complète prête à imprimer / export PDF via la boîte d'impression du navigateur).

---

## 🧰 Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npx drizzle-kit push` | Applique le schéma Drizzle à la base |
| `npx drizzle-kit studio` | Explorateur de base de données |
| `npx tsx src/db/seed.ts` | Réinitialise + injecte les données de démo |

---

## 🩺 Dépannage

| Problème | Solution |
| --- | --- |
| `DATABASE_URL is required` | Le fichier `.env` est absent ou mal nommé → `cp .env.example .env` |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL n'est pas démarré (`brew services start postgresql` / `sudo service postgresql start` / `docker compose up -d db`) |
| `database "app_db" does not exist` | `createdb app_db` |
| `relation "products" does not exist` | Le schéma n'a pas été poussé → `npx drizzle-kit push` |
| Écran de login en boucle | Cookies bloqués ou `JWT_SECRET` modifié après connexion → vider les cookies du site |
| « Integrity checksum mismatch » au scan | `QR_SECRET` a changé depuis l'impression → réimprimer les étiquettes |
| Caméra inaccessible sur mobile | Utiliser HTTPS (tunnel ngrok/localtunnel) ou la saisie manuelle |
| Port 3000 occupé | `PORT=3001 npm start` ou `npx next dev -p 3001` |
