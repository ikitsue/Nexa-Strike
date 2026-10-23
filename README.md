# NexaStrike

Projet multi-plateforme pour la gestion et la visualisation de cartes, suggestions et clips.

## Description

NexaStrike est une application composée de plusieurs parties : backend (API + base de données), frontend web, et une version desktop electron. Ce dépôt contient le code source, les scripts d'initialisation de la base et les assets nécessaires.

## Arborescence principale

- `backend/` : API Node.js et scripts d'initialisation de la base de données
- `desktop/` : application Electron pour bureau
- `frontend/` et `src/` : interfaces web (plusieurs variantes pour déploiement)
- `public/`, `uploads/` : assets publics et fichiers uploadés

## Prérequis

- Node.js (>=14)
- npm ou yarn
- PostgreSQL (si vous utilisez le backend en local)

## Installation et exécution rapide

1. Installer les dépendances (racine ou dossiers spécifiques) :

```
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. Initialiser la base de données (si nécessaire) :

```
node backend/init-db.js
```

3. Lancer le backend :

```
cd backend
npm start
```

4. Lancer le frontend (développement) :

```
cd frontend
npm start
```

5. Lancer l'app desktop (si configurée) :

```
cd desktop
npm start
```

## Configuration

Vérifiez `backend/config/database.js` pour les paramètres de connexion à la base. Utilisez des variables d'environnement pour les identifiants sensibles.

Pour le frontend, copiez `frontend/.env.example` vers `frontend/.env.local` et renseignez les variables requises. Les fichiers `.env*` contenant des valeurs locales ou de production ne doivent pas être ajoutés à Git. La clé Supabase publishable/anon est destinée au client ; ne placez jamais une clé `service_role` ou un autre secret serveur dans le frontend.

Pour le backend, copiez `backend/.env.example` vers `backend/.env` et remplacez les valeurs d'exemple par vos propres paramètres. Ne publiez pas les fichiers `.env`. Le script `node backend/set-user-admin.js <email-utilisateur>` exige l'adresse e-mail explicitement ; adaptez aussi les valeurs d'exemple de `backend/create_admin.sql` avant de l'exécuter.

Pour publier ce projet dans un nouveau dépôt sans réexposer les anciens e-mails de commit ou les références de pull request, créez un dépôt Git neuf et publiez un instantané du code sans importer l'ancien historique. Configurez Git pour utiliser l'adresse e-mail `noreply` fournie par GitHub avant de créer le premier commit public.

## Sécurité Supabase

La migration `supabase/migrations/20261012075726_secure_admin_authorization.sql` protège les tables `users`, `maps`, `utility_points`, `suggestions`, `clips` et `comments`. Elle remplace les politiques RLS existantes sur ces tables, limite les droits SQL, retire aux clients l'accès aux mots de passe et jetons stockés dans `users`, et réserve les changements de rôle, de bannissement et d'approbation aux administrateurs autorisés.

Cette migration suppose que les tables applicatives de `backend/database.sql` existent déjà dans le projet Supabase. Après avoir lié le dépôt au bon projet, examiner le plan de migration puis appliquer les migrations avec `supabase db push --linked`. Ne pas appliquer cette migration à un autre projet par erreur. Le script `backend/supabase-rls.sql` est maintenu pour les installations manuelles existantes.

Les contrôles React sur `/admin`, `/admin/tickets`, `/utility-manager` et l'éditeur de cartes servent uniquement à masquer l'interface : les politiques RLS et les privilèges PostgreSQL restent la protection réelle des données et opérations.

Le test pgTAP `supabase/tests/admin_authorization_test.sql` vérifie les tentatives d'auto-promotion, de changement de bannissement et d'auto-approbation. Il s'exécute avec `supabase test db` dans un environnement Supabase local qui contient le schéma applicatif.

### Système de tickets

Sur le site web, les tickets et leurs réponses sont stockés dans Supabase. Les administrateurs les gèrent sur `/admin/tickets` ; les utilisateurs connectés retrouvent leurs tickets sur `/my-tickets`. Un ticket envoyé sans compte peut être rattaché au suivi après connexion ou inscription avec la même adresse e-mail vérifiée.

Pour activer le système dans un projet Supabase :

1. Lier le bon projet avec `supabase link`, puis examiner et appliquer la migration avec `supabase db push --linked`.
2. Configurer le secret `HCAPTCHA_SECRET` dans **Supabase Dashboard → Edge Functions → Secrets** (ou avec `supabase secrets set HCAPTCHA_SECRET=<secret>`). Ne jamais mettre ce secret dans le frontend ni dans le dépôt.
3. Déployer l’Edge Function avec `supabase functions deploy create-ticket`.

La création publique passe par cette fonction et vérifie hCaptcha côté serveur. Les clés Supabase restent gérées par l’environnement Edge ; aucune clé `service_role` n’est nécessaire dans le frontend.

## Scripts utiles

- `scripts/set-version.js` : synchronise la version dans les différents sous-projets ; l’option `--bump` incrémente la version de publication
- Les commandes `dev` et `start` conservent la version actuelle ; les commandes `build` incrémentent la version avant la compilation
- `backend/init-db.js` : script d'initialisation de la base

## Contribution

Bienvenue ! Ouvrez une issue pour proposer des améliorations ou soumettez une pull request avec une description claire des changements.

## Licence

Voir `package.json` pour les informations de licence.
"# Nexa-Strike" 
"# Nexa-Strike" 
"# Nexa-Strike" 
