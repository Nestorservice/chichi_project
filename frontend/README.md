# Mboa — Frontend (React + Vite)

Interface client de la plateforme de restauration camerounaise. Elle consomme
l'API du backend `resto-cm` et met en avant le **filtrage santé** : l'utilisateur
choisit son profil (diabétique, sportif, végétarien…) et ne voit que les plats
compatibles.

## Fonctionnalités
- Catalogue filtré en direct par profil santé + allergies + type de cuisine
- Cartes de plat avec badges de compatibilité et mention « validé nutritionniste »
- Inscription / connexion avec saisie du profil santé (qui pré-active les filtres)
- Panier et passage de commande (adresse + Mobile Money / à la livraison)

## ⚠️ Étape obligatoire côté backend : activer CORS
Le navigateur bloque par défaut les appels du frontend (port 5173) vers l'API
(port 3000). Dans le dossier **du backend** `resto-cm`, faites :

```bash
npm install cors
```

Puis, dans `resto-cm/src/app.js`, ajoutez ces deux lignes juste après la
création de l'app Express :

```js
const cors = require('cors');
// ...
const app = express();
app.use(cors());            // <-- AJOUTER cette ligne
app.use(express.json());
```

Relancez ensuite le backend (`npm start`). Sans cela, le frontend affichera
des plats vides et une erreur CORS dans la console du navigateur.

## Lancer le frontend
```bash
npm install
npm run dev
```
Ouvrez l'adresse affichée (http://localhost:5173). Le backend doit tourner en
parallèle sur le port 3000.

## Où se trouve quoi
```
src/
├── api.js                    Appels à l'API (modifiez BASE si besoin)
├── App.jsx                   État global, filtres, panier, auth
├── styles.css                Identité visuelle (vert ndolè + ambre épice)
└── components/
    ├── FilterBar.jsx         Puces de profil santé + sélecteur de cuisine
    ├── ProductCard.jsx       Carte de plat avec badges
    ├── AuthModal.jsx         Connexion / inscription + profil santé
    └── CartDrawer.jsx        Panier et commande
```

## Connecter une autre adresse d'API
Par défaut le frontend appelle `http://localhost:3000`. Pour pointer ailleurs
(serveur distant), modifiez la constante `BASE` en haut de `src/api.js`.
