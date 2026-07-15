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
4. Accédez à l'onglet **Variables** de ce service backend et liez-le à la base de données MySQL :
   * Cliquez sur **New Variable** > **Reference** pour lier les variables MySQL du service de base de données (ceci se fait automatiquement en référençant les variables MySQL ou en ajoutant `DATABASE_URL`).
   * Ajoutez la variable d'administration secrète :
     * Clé : `JWT_SECRET` | Valeur : `CameroonRestoSecretToken2026!` (ou une autre chaîne complexe).
     * Clé : `ADMIN_REGISTRATION_SECRET` | Valeur : `CameroonRestoAdmin2026!`
   * Le backend se connectera automatiquement à la base de données grâce aux variables `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` et `MYSQLPORT` déjà injectées par Railway.
5. Accédez aux paramètres (**Settings**) du service backend, puis sous **Networking**, cliquez sur **Generate Domain** pour exposer publiquement votre API.
   * Notez cette URL générée (ex : `https://chichi-project-production.up.railway.app`).

---

## Étape 4 : Initialisation des Tables de la Base de Données

Pour créer les tables nécessaires, exécutez le script SQL initial sur votre instance Railway :
1. Sur Railway, cliquez sur votre service **MySQL**.
2. Ouvrez l'onglet **Query** (ou utilisez un client SQL externe comme DBeaver/TablePlus en copiant les coordonnées de connexion de l'onglet **Connect**).
3. Copiez et collez le contenu du fichier [schema.sql](file:///C:/Users/Nestor%20Corneille/Desktop/chichi%20code/backend/schema.sql) pour créer toutes les tables et contraintes.
4. Pour créer les tables d'avis et suggestions (Reviews), copiez et exécutez le contenu DDL du fichier de migration [migrate_reviews.js](file:///C:/Users/Nestor%20Corneille/Desktop/chichi%20code/backend/src/migrate_reviews.js) :
   ```sql
   ALTER TABLE orders ADD COLUMN has_review BOOLEAN NOT NULL DEFAULT FALSE;

   CREATE TABLE reviews (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     order_id BIGINT UNIQUE NOT NULL,
     customer_name VARCHAR(120) NOT NULL,
     app_rating INT NOT NULL CHECK (app_rating BETWEEN 1 AND 5),
     suggestions TEXT,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
   );

   CREATE TABLE product_reviews (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     review_id BIGINT NOT NULL,
     product_id BIGINT NOT NULL,
     product_name VARCHAR(160) NOT NULL,
     rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
     FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
   );
   ```

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
