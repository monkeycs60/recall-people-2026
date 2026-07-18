# Recall People API

API Node.js de Recall People, construite avec Hono et hébergée sur le VPS de production via Coolify.

## Production

- Runtime : Node.js sur le service Coolify `recall-people-api`
- URL publique : `https://api.recallpeople.com`
- Base de données : PostgreSQL sur le VPS
- Stockage des avatars : Cloudflare R2, appelé depuis Node via son API S3 compatible
- IA texte : Cerebras par défaut, avec OpenAI et xAI selon les fonctionnalités/configurations
- Transcription : Groq Whisper
- Observabilité : PostHog Cloud EU, sans prompts ni réponses IA

## Développement local

Prérequis : Node.js 20+, npm et Docker.

```bash
cd backend
npm install
cp .env.example .dev.vars
npm run dev
```

`npm run dev` démarre le PostgreSQL local, applique le schéma Prisma et lance l'API Node en mode watch. Le port par défaut est `3000`; les scripts de développement du projet peuvent définir `PORT=8787` pour l'app mobile locale.

Commandes utiles :

```bash
npm run dev             # PostgreSQL local + API Node en watch
npm run dev:node        # API Node seule, sans bootstrap de la base
npm run typecheck       # Vérification TypeScript
npm test                # Tests Node
npm run db:generate     # Générer le client Prisma
npm run db:deploy       # Appliquer les migrations en attente (production)
npm run db:push         # Appliquer le schéma à la base ciblée
npm run db:refresh-dev  # Rafraîchir la base locale depuis le snapshot VPS
npm run db:studio       # Ouvrir Prisma Studio
```

## Variables d'environnement

La liste de référence est dans [`.env.example`](./.env.example). Les variables de production sont configurées dans Coolify sur le service `recall-people-api`.

Variables essentielles :

- `DATABASE_URL`
- `JWT_SECRET`
- `SYNC_ENCRYPTION_KEY`
- `GROQ_API_KEY`
- `CEREBRAS_API_KEY`
- `OPENAI_API_KEY`
- `XAI_API_KEY`
- identifiants Google OAuth
- accès R2 : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

Pour la révocation Sign in with Apple lors d'une suppression de compte :

- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`
- `APPLE_CLIENT_ID=com.monkeycs60.recallpeople2026`

`APPLE_PRIVATE_KEY` accepte soit un PEM multiligne, soit des retours à la ligne encodés sous forme de `\\n`.

## Déploiement VPS

Le déploiement de production se fait exclusivement avec Coolify :

1. pousser le commit validé sur `master` ;
2. ouvrir le service Coolify `recall-people-api` ;
3. vérifier les variables d'environnement ;
4. lancer **Deploy** pour construire le dernier commit de `master` ;
5. vérifier `https://api.recallpeople.com/` et les parcours critiques.

Le push GitHub et le déploiement Coolify sont deux opérations distinctes tant que l'auto-deploy Coolify n'est pas activé.

Ne jamais lancer une migration ou un déploiement de production depuis la machine locale sans demande explicite. Coolify exécute l'installation et le démarrage du service à partir de ce dossier avec :

```bash
npm install
npm start
```

`npm start` exécute automatiquement `prisma migrate deploy` avant de lancer
l'API. Une migration en attente ne peut donc plus être oubliée lors d'un
redéploiement Coolify ; si une migration échoue, le service ne démarre pas avec
un schéma incohérent.

## Endpoints principaux

- `GET /` — état de l'API
- `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/apple`
- `DELETE /auth/account`
- `POST /api/transcribe`
- `POST /api/extract`
- `POST /api/detect-contact`
- `POST /api/summary`
- `POST /api/search`
- `POST /api/ask`
- `/api/sync/*` — synchronisation chiffrée du compte
- `/api/avatar/*` — avatars stockés sur R2

## Validation avant déploiement

```bash
cd backend
npm run typecheck
npm test
```

Après déploiement :

```bash
curl -fsS https://api.recallpeople.com/
```

Réponse attendue :

```json
{"status":"ok","service":"recall-people-api","version":"1.0.0"}
```

## Sécurité et confidentialité

- Le contenu synchronisé est chiffré avec `SYNC_ENCRYPTION_KEY`.
- Les prompts et réponses IA sont masqués dans PostHog.
- Les fichiers audio sont traités pour transcription et ne sont pas conservés par Recall People.
- Les secrets de production restent dans Coolify et ne doivent jamais être commités.

## Licence

Propriétaire — Recall People.
