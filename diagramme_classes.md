# Diagramme de Classes — Mboa Resto

Ce document présente l'architecture orientée objet, le modèle de données relationnel ainsi que l'interaction entre les composants frontend et backend de l'application **Mboa Resto**.

---

## 1. Diagramme de Classes (Mermaid)

Le diagramme ci-dessous illustre la structure des données (tables relationnelles modélisées en classes), les modules du serveur backend et les composants clés de l'application frontend.

```mermaid
classDiagram
  %% ==========================================
  %% MODÈLE DE DONNÉES & BDD
  %% ==========================================
  class User {
    +id: bigint
    +full_name: string
    +phone: string
    +email: string
    +password_hash: string
    +role: string
    +created_at: timestamp
    +signUp()
    +login()
    +updateProfile()
  }

  class HealthCondition {
    <<enumeration>>
    DIABETIQUE
    SPORTIF
    MINCEUR
    HYPERTENSION
    VEGETARIEN
    VEGAN
    SANS_GLUTEN
  }

  class Allergen {
    <<enumeration>>
    ARACHIDE
    GLUTEN
    LACTOSE
    OEUF
    POISSON
    FRUITS_DE_MER
    SOJA
    PORC
  }

  class Product {
    +id: bigint
    +name: string
    +description: string
    +price_fcfa: int
    +category_id: bigint
    +chef_id: bigint
    +cuisine: string
    +image_url: string
    +is_available: boolean
    +is_vegetarian: boolean
    +is_vegan: boolean
    +is_gluten_free: boolean
    +nutritionist_validated: boolean
    +created_at: timestamp
    +updated_at: timestamp
  }

  class ProductNutrition {
    +product_id: bigint
    +portion_g: int
    +calories_kcal: decimal
    +carbs_g: decimal
    +sugars_g: decimal
    +protein_g: decimal
    +fat_g: decimal
    +fiber_g: decimal
    +sodium_mg: decimal
    +glycemic_index: int
  }

  class ProductHealthTag {
    <<enumeration>>
    DIABETIQUE_COMPATIBLE
    SPORTIF
    MINCEUR
    HYPERTENSION_COMPATIBLE
    RICHE_PROTEINES
    FAIBLE_CALORIE
    VEGETARIEN
    VEGAN
    SANS_GLUTEN
  }

  class Chef {
    +id: bigint
    +name: string
    +bio: string
  }

  class Category {
    +id: bigint
    +name: string
  }

  class Order {
    +id: bigint
    +user_id: bigint
    +status: string
    +total_fcfa: int
    +delivery_address: string
    +payment_method: string
    +created_at: timestamp
    +latitude: decimal
    +longitude: decimal
    +delivery_choice_made: boolean
  }

  class OrderItem {
    +id: bigint
    +order_id: bigint
    +product_id: bigint
    +quantity: int
    +unit_price_fcfa: int
  }

  %% ==========================================
  %% BACKEND SERVICE & CONTROLLERS
  %% ==========================================
  class AuthController {
    +inscription(req, res)
    +connexion(req, res)
    +recupererProfil(req, res)
    +mettreAJourProfil(req, res)
  }

  class ProductController {
    +listerTous(req, res)
    +recupererDetails(req, res)
    +creer(req, res)
    +modifier(req, res)
    +supprimer(req, res)
  }

  class OrderController {
    +creer(req, res)
    +mesCommandes(req, res)
    +toutesCommandes(req, res)
    +changerStatut(req, res)
    +definirChoixLivraison(req, res)
    +streamCommandes(req, res)
  }

  class ChatController {
    +discuter(req, res)
    +interpreter(message)
    -discuterRegexFallback(message, res)
  }

  class HealthEngine {
    +SEUILS: object
    +deriverTagsSante(nutrition, flags): string[]
    +tagsRequis(conditions): string[]
  }

  class UploadMiddleware {
    +upload: multer
    +champsImages: array
    +uploadToCloudinary(file): string
  }

  %% ==========================================
  %% FRONTEND ARCHITECTURE
  %% ==========================================
  class ApiClient {
    +listerProduits(filters)
    +detailProduit(id)
    +inscription(payload)
    +connexion(payload)
    +passerCommande(token, payload)
    +discuter(message)
  }

  class App {
    <<Component>>
    +cart: array
    +vue: string
    +user: object
    +playChime()
    +ajouter(plat)
    +ajouterPlusieurs(platsList)
  }

  class ChatBubble {
    <<Component>>
    +messages: array
    +ouvert: boolean
    +formatTexte(texte): ReactElement
    +envoyer()
  }

  class AdminPanel {
    <<Component>>
    +commandes: array
    +plats: array
    +activeTab: string
    +chargerCommandes()
    +chargerPlats()
  }

  %% ==========================================
  %% RELATIONS & DEPENDANCES
  %% ==========================================
  User "1" --* "0..*" HealthCondition : a
  User "1" --* "0..*" Allergen : a
  Product "1" -- "1" ProductNutrition : possède
  Product "1" --* "0..*" ProductHealthTag : déduit
  Product "1" --* "0..*" Allergen : contient
  Chef "1" -- "0..*" Product : cuisine
  Category "1" -- "0..*" Product : contient
  User "1" -- "0..*" Order : passe
  Order "1" --* "1..*" OrderItem : contient
  Product "1" -- "0..*" OrderItem : est lié

  ProductController --> HealthEngine : calcule via
  ProductController --> UploadMiddleware : gère images via
  ChatController --> Product : analyse catalogue
  ChatController --> ApiClient : requêtes Groq (Llama)
  OrderController --> User : notifie via SSE

  App --> ApiClient : interagit via
  App *-- ChatBubble : intègre
  App *-- AdminPanel : intègre
  ChatBubble --> ApiClient : communique via
  AdminPanel --> ApiClient : communique via
```

---

## 2. Description des Entités Principales

### A. Modèle de Données (Base de données MySQL)
1. **`User`** : Représente les utilisateurs de la plateforme (clients et administrateurs). Un utilisateur peut être lié à plusieurs conditions de santé (`HealthCondition`) et allergies (`Allergen`).
2. **`Product`** : Représente les plats proposés au menu. Chaque plat possède un ensemble d'indicateurs de base (`is_vegetarian`, etc.) saisis par l'administrateur, et un profil nutritionnel précis.
3. **`ProductNutrition`** : Contient les valeurs nutritionnelles par portion d'un plat (index glycémique, sucres, sodium, calories, etc.). C'est à partir de cette table que les tags de santé sont déduits.
4. **`ProductHealthTag`** : Les tags de compatibilité santé calculés automatiquement par le serveur en temps réel via le **`HealthEngine`**. Cela évite les erreurs humaines lors de la saisie des compatibilités (ex. un plat n'est tagué *Sportif* que s'il respecte le seuil minimum de protéines).
5. **`Order`** & **`OrderItem`** : Représentent les commandes des clients et leur contenu. Elles stockent également les coordonnées géographiques (`latitude`, `longitude`) de livraison.

### B. Contrôleurs & Logique Backend (Node.js)
1. **`HealthEngine`** : C'est le cœur clinique de l'application. Il contient les seuils nutritionnels de référence (ex. index glycémique $\le 55$ pour le diabète) et calcule de façon algorithmique les tags de chaque plat.
2. **`ChatController`** : Gère l'assistant virtuel. Si configuré, il transmet les messages des clients à l'API **Groq** avec le modèle de raisonnement **`llama-3.3-70b-versatile`** en y adjoignant la liste complète des plats disponibles pour que l'IA puisse raisonner et conseiller de manière personnalisée et scientifiquement justifiée.
3. **`OrderController`** : Traite les commandes et gère le canal **SSE (Server-Sent Events)** pour envoyer instantanément des alertes sonores et des notifications aux administrateurs lors de la réception d'une commande.

### C. Interface Utilisateur Frontend (React / Vite)
1. **`App`** : Point central de l'interface qui coordonne l'état du panier (cart), l'authentification de l'utilisateur et gère la connexion SSE en temps réel.
2. **`ChatBubble`** : Interface de messagerie PWA compacte et stylisée. Elle comprend un parseur markdown interne (`formatTexte`) pour éliminer les astérisques bruts et afficher du texte enrichi (gras, listes à puces) ainsi que des actions rapides (Ajout collectif au panier et validation de commande).
3. **`AdminPanel`** : Tableau de bord de l'administrateur permettant de gérer les statistiques financières, le statut des commandes et l'édition de la carte.
