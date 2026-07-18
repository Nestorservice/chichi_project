# Modélisation UML & Captures d'Écran — Mboa Resto

Ce document rassemble les versions révisées du diagramme de classes et des deux diagrammes de séquences, en y intégrant l'**IA Nutritionniste (Modèle Llama 3.3 via Groq)** comme un acteur ou entité centrale du système. Il fournit également une description détaillée de chaque capture d'écran pour agrémenter le rapport.

---

## 1. Diagramme de Classes Révisé (avec IA intégrée)

Le diagramme de classes ci-dessous montre comment l'agent IA (`AI_Nutritionist_Agent`) s'interface avec le reste de l'application en consommant le catalogue des plats (`Product`) et leurs valeurs nutritionnelles pour répondre aux requêtes personnalisées des utilisateurs.

```mermaid
classDiagram
  %% MODÈLE DE DONNÉES MySQL
  class User {
    +id: bigint
    +full_name: string
    +phone: string
    +email: string
    +role: string
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
    +price_fcfa: int
    +cuisine: string
    +image_url: string
    +is_available: boolean
  }

  class ProductNutrition {
    +product_id: bigint
    +calories_kcal: decimal
    +carbs_g: decimal
    +sugars_g: decimal
    +protein_g: decimal
    +sodium_mg: decimal
    +glycemic_index: int
  }

  class Order {
    +id: bigint
    +user_id: bigint
    +status: string
    +total_fcfa: int
    +delivery_address: string
    +latitude: decimal
    +longitude: decimal
  }

  class OrderItem {
    +id: bigint
    +order_id: bigint
    +product_id: bigint
    +quantity: int
  }

  %% AGENT D'INTELLIGENCE ARTIFICIELLE
  class AI_Nutritionist_Agent {
    <<Service Cloud - Groq>>
    +model_name: "llama-3.3-70b-versatile"
    +temperature: 0.3
    +system_prompt: string
    +parseUserIntent(message)
    +reasonStepByStep(profile, catalog)
    +generateRecommendations(): string_JSON
  }

  class ChatController {
    <<Backend Controller>>
    +discuter(req, res)
    +fetchCatalogWithNutrition(): Array
    +formatCatalogForAI(products): string
    +extractRecommendedIDs(reply): int[]
  }

  %% FRONTEND & API
  class ApiClient {
    +discuter(message)
    +passerCommande(payload)
  }

  class ChatBubble {
    <<Component React>>
    +messages: array
    +ouvert: boolean
    +formatTexte(texte)
    +envoyerMessage()
    +toutAjouterAuPanier()
    +commanderInstantanement()
  }

  %% RELATIONS & HIERARCHIE
  User "1" --* "0..*" HealthCondition : a
  User "1" --* "0..*" Allergen : a
  Product "1" -- "1" ProductNutrition : possède
  User "1" -- "0..*" Order : passe
  Order "1" --* "1..*" OrderItem : contient
  Product "1" -- "0..*" OrderItem : est lié

  %% INTERACTION DE L'IA
  ChatController --> AI_Nutritionist_Agent : interroge via API
  ChatController --> Product : charge plats pour context
  ChatBubble --> ApiClient : envoie invites via
  ApiClient --> ChatController : route requêtes vers
  AI_Nutritionist_Agent ..> ProductNutrition : analyse diététique
  ChatBubble ..> Order : peut initier commande
```

---

## 2. Diagramme de Séquence : S'Authentifier & Initialiser l'IA

Ce diagramme montre comment la connexion de l'utilisateur charge son profil médical et ses restrictions d'allergies pour configurer l'**IA Nutritionniste** en temps réel, garantissant des réponses adaptées dès le premier message.

```mermaid
sequenceDiagram
  autonumber
  actor Client as Client / Navigateur
  participant Front as Frontend (React App)
  participant Back as Backend (Express API)
  participant BDD as Base de données (MySQL)
  participant IA as Agent IA (Llama 3.3)

  Client->>Front: Saisit identifiants et valide
  Front->>Back: POST /api/auth/connexion { phone, password }
  activate Back
  Back->>BDD: SELECT * FROM users WHERE phone = ?
  activate BDD
  BDD-->>Back: Infos utilisateur & hash de mot de passe
  deactivate BDD
  
  Note over Back: Validation du hash par bcrypt
  
  Back->>BDD: SELECT condition FROM user_health_conditions WHERE user_id = ?
  activate BDD
  BDD-->>Back: Liste des pathologies (ex. Diabète)
  deactivate BDD

  Back->>BDD: SELECT allergen FROM user_allergies WHERE user_id = ?
  activate BDD
  BDD-->>Back: Liste des allergies (ex. Arachides)
  deactivate BDD

  Note over Back: Signature du JWT contenant<br/>le rôle, l'id, et le profil de santé
  
  Back-->>Front: Retourne 200 OK { token, user: { full_name, health_profile, allergies } }
  deactivate Back
  
  Front->>Front: Enregistre le token dans localStorage
  
  Note over Front, IA: Initialisation du profil diététique du Chatbot
  Front->>IA: Configure l'invite contextuelle (System Prompt) avec le profil diététique chargé
  Front->>Client: Redirige vers le catalogue avec l'assistant prêt
```

---

## 3. Diagramme de Séquence : Dialogue IA -> Recommandation -> Commande & SSE

Ce diagramme illustre le parcours d'achat assisté par l'IA : dialogue, raisonnement clinique de l'IA, recommandation visuelle de plats, ajout collectif au panier d'un clic, validation de commande, transaction BDD, et émission de l'alerte sonore SSE vers l'administrateur.

```mermaid
sequenceDiagram
  autonumber
  actor Client as Client
  participant Front as ChatBubble / Navigateur
  participant Back as Backend (Express API)
  participant BDD as Base de données (MySQL)
  participant IA as Agent IA (Llama 3.3)
  participant AdminFront as Espace Admin (React)

  Note over AdminFront, Back: L'admin est connecté et écoute le flux SSE
  
  Client->>Front: "Je suis diabétique, propose-moi un plat camerounais"
  activate Front
  Front->>Back: POST /api/chat { message: "..." }
  activate Back
  
  Back->>BDD: SELECT * FROM products JOIN product_nutrition JOIN product_health_tags WHERE is_available = 1
  activate BDD
  BDD-->>Back: Liste complète des plats avec nutriments réels
  deactivate BDD

  Note over Back: Injection du catalogue dans le System Prompt de l'IA

  Back->>IA: Envoie requête chat/completions (System Prompt + message client)
  activate IA
  Note over IA: Raisonnement de l'IA (CoT) :<br/>1. Exclut plats incompatibles<br/>2. Filtre par nutriments (IG < 55)<br/>3. Sélectionne les plats 1 et 3
  IA-->>Back: Réponse rédigée + [RECOMMENDATIONS: [1, 3]]
  deactivate IA

  Note over Back: Extrait les IDs [1, 3] et charge les fiches produits complètes
  Back-->>Front: Retourne { reponse: "...", plats: [Ndolè, Eru] }
  deactivate Back
  
  Front->>Front: Interprète le texte en HTML (sans astérisques bruts)<br/>et affiche les vignettes des plats avec boutons d'actions
  Front->>Client: Affiche le dialogue et les plats 1 & 3 recommandés
  deactivate Front

  Client->>Front: Clique sur le bouton d'action "Commander" du chat
  activate Front
  Front->>Front: Exécute ajouterPlusieurs([Plat 1, Plat 3]) au panier
  Front->>Front: Ouvre automatiquement le tiroir du panier (Checkout)
  
  Client->>Front: Confirme la livraison et le paiement
  Front->>Back: POST /api/orders { items: [1, 3], delivery_address, ... }
  activate Back
  
  Back->>BDD: START TRANSACTION & INSERT INTO orders / order_items
  activate BDD
  BDD-->>Back: Transaction validée (Commit) et orderId généré
  deactivate BDD

  Note over Back: Envoi instantané du push SSE à l'admin
  Back->>AdminFront: data: { type: 'admin_new_order', orderId, orderRows }
  activate AdminFront
  AdminFront->>AdminFront: Déclenche le carillon sonore : playChime()
  AdminFront->>AdminFront: Ajoute la nouvelle commande en tête de liste sans rechargement
  deactivate AdminFront

  Back-->>Front: Retourne 201 Created { status: 'en_attente' }
  deactivate Back
  Front->>Front: Vide le panier d'achat local (setCart([]))
  Front->>Client: Affiche l'écran de succès de la commande
  deactivate Front
```

---

## 4. Description des Captures d'Écran pour le Rapport

Voici les descriptions textuelles détaillées à intégrer dans la **Section 2 du Chapitre 4 (Présentation de l'application)** de votre rapport pour justifier les images :

* **Figure 7 – Écran d'accueil & Hero Banner** : Affiche la page d'accueil de l'application conçue pour faire forte impression (Hero Banner haut de gamme). Le titre accrocheur (« La cuisine camerounaise qui vous correspond ») et le sous-titre explicatif sont directement superposés sur des images rotatives de spécialités locales (cuit sans excès d'huile, Ndolè, Poulet DG). L'opacité des images de fond est calée à 65% pour garantir un contraste élevé et une lisibilité parfaite des textes blancs, éliminant toute boîte de flou (frosted card) obstructive.
* **Figure 8 – Bannière d'installation PWA (Android & iOS)** : Illustre le système d'installation autonome de l'application sur l'écran d'accueil du mobile. Sur Android, un bouton d'installation directe est affiché grâce à l'événement `beforeinstallprompt`. Sur iOS/Safari (détection en mode standalone), un guide illustré s'affiche de manière conviviale pour indiquer au client les actions à mener (cliquer sur Partager puis sur « Sur l'écran d'accueil ») pour disposer de l'application hors ligne avec le logo officiel de Mboa.
* **Figure 9 – Inscription Client & Déclaration de Santé** : Capture d'écran de l'interface d'inscription. En plus des informations classiques (nom, numéro de téléphone), le formulaire propose des cases à cocher permettant au client d'indiquer ses contraintes de santé (diabétique, hypertendu, sportif, etc.) et ses allergies alimentaires (arachide, lactose, porc). Ces critères alimenteront le moteur de filtrage pour adapter la carte.
* **Figure 10 – Catalogue de plats validés par la nutrition** : Affiche la grille du menu principal de Mboa Resto. Les plats de la cuisine camerounaise (Ndolè, Eru, etc.) apparaissent sous forme de cartes élégantes avec leur prix en FCFA, leur photo hébergée sur Cloudinary et, de façon proéminente, des badges de compatibilité couleur (ex: « Diabète OK », « Tension OK ») qui sont le fruit des calculs algorithmiques du moteur clinique, attestant d'une carte validée diététiquement.
* **Figure 11 – Bulle d'assistant nutritionnel intelligent (IA Llama 3.3)** : Affiche la fenêtre de discussion compacte (330x450px) avec l'IA. On y voit des conseils nutritionnels formulés en français correct dans des paragraphes courts de 1 à 2 lignes (très faciles à lire, sans astérisques ni puces bruts grâce au parseur markdown). L'IA recommande des plats du menu qui s'affichent sous forme de vignettes miniatures à l'intérieur du chat avec des boutons interactifs permettant de tout ajouter au panier ou de commander instantanément.
* **Figure 12 – Tiroir de Panier & Choix de livraison géolocalisé** : Capture d'écran du volet de commande (Cart Drawer) et de son modal interactif. Le client y voit le récapitulatif de ses plats et peut cliquer sur le bouton de géolocalisation pour ouvrir une carte OpenStreetMap interactive (via Leaflet) afin de placer manuellement son point de livraison précis (coordonnées GPS latitude et longitude enregistrées en base de données).
* **Figure 13 – Tableau de bord de l'administrateur en temps réel (SSE)** : Console d'administration centrale montrant les revenus, les statistiques et le flux des commandes de la journée. Un carillon audio retentit et l'affichage se met à jour en temps réel à la seconde près dès qu'une commande est soumise par un client, sans aucune actualisation de page, grâce au canal Server-Sent Events (SSE).
* **Figure 14 – Gestion de la carte & Calcul diététique (Admin)** : Interface permettant à l'administrateur d'éditer la carte des plats. L'admin importe l'image du plat (envoyée automatiquement sur Cloudinary) et saisit les valeurs nutritionnelles réelles du plat (calories, index glycémique, sodium, protéines). L'algorithme calcule instantanément en arrière-plan les tags de santé correspondants avant l'enregistrement.
* **Figure 15 – Formulaire de notation et d'avis client** : Vue modale s'affichant pour le client après la réception de sa commande. Le client peut évaluer l'application et la qualité gustative des plats en sélectionnant de 1 à 5 étoiles et en saisissant un retour d'expérience textuel, que l'administrateur peut ensuite consulter pour améliorer les recettes.
