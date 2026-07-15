# API — Plateforme de restauration camerounaise (filtrage santé)

Backend d'une marketplace de restauration (cuisine camerounaise + fast-food)
dont le cœur est un **moteur de filtrage santé** : chaque plat porte un profil
nutritionnel, d'où sont déduits automatiquement des tags de compatibilité
(diabétique, sportif, minceur, végétarien…) servant à filtrer le catalogue
selon le profil de chaque utilisateur.

## Pile technique
- **PostgreSQL 14+** — base de données
- **Node.js 18+ / Express** — API REST
- **bcryptjs** (mots de passe) et **jsonwebtoken** (authentification)

## Structure
```
resto-cm/
├── schema.sql                  Modèle de données + données de démo
├── src/
│   ├── app.js                  Point d'entrée (routes Express)
│   ├── db.js                   Connexion PostgreSQL
│   ├── healthEngine.js         MOTEUR DE FILTRAGE — cœur du projet
│   ├── middleware/auth.js      JWT + garde administrateur
│   └── controllers/            auth · produits · commandes
└── test/healthEngine.test.js   Tests du moteur (sans base de données)
```

## Le modèle de données en bref
- `users` + `user_health_conditions` + `user_allergies` : le profil santé de
  l'utilisateur (il peut cumuler plusieurs conditions).
- `products` + `product_nutrition` : le plat et ses valeurs nutritionnelles.
  Les régimes non déductibles de la nutrition (végétarien, végan, sans gluten)
  sont des indicateurs saisis par l'admin.
- `product_health_tags` : tags **calculés** par le moteur (jamais saisis).
- `product_allergens` : allergènes du plat.
- `orders` + `order_items` : les commandes.

## Comment fonctionne le filtrage
1. L'admin saisit la nutrition d'un plat (`POST /api/admin/products`).
2. `healthEngine.deriverTagsSante()` en déduit les tags selon des seuils
   (ex. *index glycémique ≤ 55 et sucres ≤ 10 g → compatible diabétique*).
   Ces tags sont stockés dans `product_health_tags`.
3. Côté client, `GET /api/products?conditions=diabetique,sportif&allergies=arachide`
   renvoie les plats portant **tous** les tags requis et **aucun** allergène
   de l'utilisateur.

> ⚠️ **Avertissement santé.** Les seuils du moteur (`SEUILS` dans
> `healthEngine.js`) sont des valeurs de départ qui **doivent être validées par
> un(e) nutritionniste** avant toute mise en production. L'application fournit
> une information indicative et ne remplace pas un avis médical.

## Installation
```bash
# 1. Base de données
createdb resto_cm
psql resto_cm < schema.sql

# 2. Configuration
cp .env.example .env      # puis renseignez DATABASE_URL et JWT_SECRET

# 3. Dépendances et lancement
npm install
npm start                 # API sur http://localhost:3000

# Tests du moteur (aucune base requise)
npm test
```

## Principaux points d'API
| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| POST | `/api/auth/inscription` | public | crée un compte + profil santé |
| POST | `/api/auth/connexion` | public | renvoie un token JWT |
| GET | `/api/products` | public | catalogue filtré (`conditions`, `allergies`, `cuisine`) |
| GET | `/api/products/:id` | public | fiche plat (nutrition, tags, allergènes) |
| POST | `/api/admin/products` | admin | crée un plat (tags recalculés) |
| PUT | `/api/admin/products/:id` | admin | modifie un plat (tags recalculés) |
| DELETE | `/api/admin/products/:id` | admin | supprime un plat |
| POST | `/api/orders` | client | passe une commande |
| GET | `/api/orders` | client | historique des commandes |

## À brancher ensuite
- **Paiement Mobile Money** (MTN MoMo / Orange Money) via un agrégateur
  camerounais (Fapshi, Campay, Notch Pay) — point d'accroche signalé dans
  `orderController.js`.
- **Chatbot** : il interroge `GET /api/products` avec les conditions déduites
  de la conversation, puis crée la commande via `POST /api/orders`.
- **Frontend** React/Next.js (web + mobile).
