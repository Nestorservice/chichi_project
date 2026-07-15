# Guide de Déploiement du Projet Mboa Resto

Ce guide détaille les étapes nécessaires pour mettre en production le backend et la base de données sur Railway, et le frontend sur Vercel.

---

## Étape 1 : Code Source sur GitHub

Le code source a été poussé sur votre dépôt GitHub :
* URL du dépôt : `https://github.com/Nestorservice/chichi_project.git`
* Branche principale : `main`

---

## Étape 2 : Déploiement de la Base de Données MySQL sur Railway

1. Connectez-vous à votre console **Railway** (https://railway.app).
2. Créez un nouveau projet (**New Project**).
3. Cliquez sur **Provision MySQL** pour créer une base de données MySQL hébergée.
4. Une fois le service MySQL créé, accédez à son onglet **Variables**. Vous y trouverez les variables d'environnement générées automatiquement :
   * `MYSQLHOST`
   * `MYSQLUSER`
   * `MYSQLPASSWORD`
   * `MYSQLDATABASE`
   * `MYSQLPORT`

---

## Étape 3 : Déploiement du Backend sur Railway

1. Dans le même projet Railway, cliquez sur **+ New** > **GitHub Repo**.
2. Sélectionnez votre dépôt `Nestorservice/chichi_project`.
3. Une fois le service importé, accédez aux paramètres de configuration (**Settings**) de ce nouveau service backend :
   * Recherchez l'option **Root Directory** (Dossier racine).
   * Modifiez cette valeur pour saisir : `backend` (cela indique à Railway de n'exécuter et packager que le dossier du serveur).
4. Accédez à l'onglet **Variables** de ce service backend et liez-le à la base de données MySQL et à Cloudinary :
   * Liez les variables MySQL du service de base de données (ceci se fait automatiquement en référençant les variables MySQL ou en ajoutant `DATABASE_URL`).
   * Ajoutez la variable d'administration secrète :
     * Clé : `JWT_SECRET` | Valeur : `CameroonRestoSecretToken2026!`
     * Clé : `ADMIN_REGISTRATION_SECRET` | Valeur : `CameroonRestoAdmin2026!`
   * **Ajoutez vos accès Cloudinary** (pour l'hébergement persistant des images) :
     * Clé : `CLOUDINARY_URL` | Valeur : `cloudinary://VOTRE_API_KEY:VOTRE_API_SECRET@VOTRE_CLOUD_NAME` (disponible sur votre tableau de bord Cloudinary).
     * *Alternativement, vous pouvez ajouter les variables séparées : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET`.*
   * Le backend se connectera automatiquement à MySQL et Cloudinary grâce à ces variables.
5. Accédez aux paramètres (**Settings**) du service backend, puis sous **Networking**, cliquez sur **Generate Domain** pour exposer publiquement votre API.
   * Notez cette URL générée (ex : `https://chichi-project-production.up.railway.app`).

---

## Étape 4 : Importation de vos Données (fichier resto.sql de XAMPP) vers Railway

Comme l'onglet Query n'est pas toujours disponible directement sur Railway selon votre plan, la méthode la plus simple et recommandée pour importer votre fichier `resto.sql` exporté de XAMPP est d'utiliser un client de base de données gratuit (comme **DBeaver**, **TablePlus**, ou **HeidiSQL**) ou la ligne de commande MySQL :

### Option A : Via la Ligne de Commande (Linter/Terminal)
1. Cliquez sur votre service **MySQL** sur Railway.
2. Ouvrez l'onglet **Connect**.
3. Copiez la commande de connexion en ligne de commande (sous **Connection Command**). Elle ressemble à ceci :
   `mysql -h HOST -u USER -pPASSWORD -P PORT DATABASE`
4. Ouvrez votre terminal sur votre ordinateur dans le dossier contenant votre fichier `resto.sql` et exécutez la commande en y rajoutant `< resto.sql` à la fin :
   ```bash
   mysql -h HOST_RAILWAY -u USER_RAILWAY -pPASSWORD_RAILWAY -P PORT_RAILWAY DATABASE_RAILWAY < resto.sql
   ```

### Option B : Via un Client de Base de Données (DBeaver, TablePlus, etc.)
1. Sur Railway, ouvrez l'onglet **Connect** de votre service MySQL et copiez l'URL de connexion (**Connection URL**).
2. Ouvrez votre client SQL (ex: TablePlus) et créez une nouvelle connexion en collant cette URL (le client va extraire automatiquement l'hôte, le port, l'utilisateur et le mot de passe).
3. Une fois connecté à la base de données Railway :
   * Faites un clic droit sur la base de données, choisissez **Import** > **SQL Dump...** (ou Restaurer).
   * Sélectionnez votre fichier local `resto.sql` issu de XAMPP et lancez l'importation.
4. Vos tables (utilisateurs, produits, commandes) et toutes vos données de test de XAMPP seront importées instantanément !

---

## Étape 5 : Déploiement du Frontend sur Vercel

1. Connectez-vous à votre console **Vercel** (https://vercel.com).
2. Cliquez sur **Add New** > **Project** et importez le dépôt GitHub `Nestorservice/chichi_project`.
3. Configurez les paramètres du projet avant de déployer :
   * **Root Directory** : Cliquez sur Edit et sélectionnez le dossier **`frontend`**.
   * **Framework Preset** : Sélectionnez **Vite** (détecté automatiquement).
   * **Build and Output Settings** : Laissez par défaut (`npm run build` et dossier de sortie `dist`).
4. Ajoutez la variable d'environnement pour connecter le frontend à votre API backend Railway :
   * Nom de la variable : **`VITE_API_URL`**
   * Valeur : L'URL publique de votre backend Railway générée à l'Étape 3 (ex : `https://chichi-project-production.up.railway.app` - sans slash final `/`).
5. Cliquez sur **Deploy**.

Une fois le déploiement terminé, Vercel vous fournira un domaine public pour accéder à votre application web PWA prête à l'emploi.
