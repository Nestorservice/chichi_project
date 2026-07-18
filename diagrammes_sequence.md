# Diagrammes de Séquences — Mboa Resto

Ce document contient les diagrammes de séquences UML modélisés en syntaxe **Mermaid** pour les deux cas d'utilisation clés de l'application **Mboa Resto**.

---

## 1. Diagramme de Séquence : S'Authentifier

Ce diagramme montre l'interaction entre le navigateur (Client/Frontend), le serveur d'API (Backend) et la base de données MySQL avec génération et validation d'un jeton JWT.

```mermaid
sequenceDiagram
  autonumber
  actor Client as Client / Navigateur
  participant Front as Frontend (React App)
  participant Back as Backend (Express API)
  participant BDD as Base de données (MySQL)

  Client->>Front: Saisit le numéro de téléphone et le mot de passe
  Client->>Front: Clique sur "Se connecter"
  Front->>Back: POST /api/auth/connexion { phone, password }
  activate Back
  Back->>BDD: SELECT * FROM users WHERE phone = ?
  activate BDD
  BDD-->>Back: Retourne les informations de l'utilisateur (avec password_hash)
  deactivate BDD

  Note over Back: Comparaison du mot de passe saisi<br/>avec le hash bcrypt stocké
  
  alt Identifiants valides
    Note over Back: Génération du Token JWT signé<br/>avec JWT_SECRET (contient id, role)
    Back-->>Front: Retourne 200 OK { token, user: { id, full_name, role } }
    Front->>Front: Stocke le jeton JWT dans localStorage
    Front->>Client: Affiche le catalogue et redirige l'utilisateur
  else Identifiants invalides
    Back-->>Front: Retourne 401 Unauthorized { erreur: "Identifiants incorrects" }
    deactivate Back
    Front->>Client: Affiche un message d'erreur à l'écran
  end
```

---

## 2. Diagramme de Séquence : Passer une commande et Notification SSE en temps réel

Ce diagramme illustre le processus complet d'achat. Il détaille comment la validation de la commande par un client déclenche instantanément le traitement transactionnel en base de données, suivi d'une notification push via **Server-Sent Events (SSE)** qui joue un carillon sonore et met à jour dynamiquement l'interface de l'administrateur sans rechargement.

```mermaid
sequenceDiagram
  autonumber
  actor Client as Client Web
  participant FrontC as Frontend Client (React)
  participant Back as Backend (Express API)
  participant BDD as Base de données (MySQL)
  participant AdminFront as Espace Admin (React)
  actor Admin as Administrateur

  Note over AdminFront, Back: Établissement de la connexion temps réel (SSE) au démarrage
  AdminFront->>Back: GET /api/orders/stream?token=admin_jwt_token
  activate Back
  Note over Back: Ajoute le flux de l'admin dans la liste des clients actifs (activeClients)
  Back-->>AdminFront: Conserve la connexion HTTP ouverte (text/event-stream)

  Note over Client, FrontC: Processus de validation de commande
  Client->>FrontC: Clique sur "Valider la commande" (Panier)
  FrontC->>Back: POST /api/orders { items, delivery_address, payment_method } (Headers: Authorization: Bearer JWT)
  
  Note over Back: Validation du token client et ouverture d'une transaction MySQL
  Back->>BDD: START TRANSACTION
  Back->>BDD: INSERT INTO orders (user_id, total_fcfa, delivery_address, payment_method)
  activate BDD
  BDD-->>Back: Retourne orderId (ID de la commande)
  deactivate BDD

  loop Pour chaque plat dans le panier
    Back->>BDD: INSERT INTO order_items (order_id, product_id, quantity, unit_price_fcfa)
  end

  Back->>BDD: COMMIT TRANSACTION
  
  Note over Back: Préparation des données complètes pour l'alerte admin
  Back->>BDD: SELECT o.*, u.full_name, u.phone, p.name, oi.quantity FROM orders o LEFT JOIN ... WHERE o.id = orderId
  activate BDD
  BDD-->>Back: Retourne les lignes détaillées (orderRows)
  deactivate BDD

  Note over Back: Diffusion SSE (Broadcast)
  loop Pour chaque client connecté dans activeClients
    alt Le client est un Administrateur (isAdmin === true)
      Back->>AdminFront: Envoie l'événement SSE 'admin_new_order' { orderId, orderRows }
      activate AdminFront
      AdminFront->>AdminFront: Joue instantanément le carillon audio : playChime()
      AdminFront->>AdminFront: Ajoute la nouvelle commande en tête de liste des commandes
      AdminFront->>Admin: Affiche une notification Toast : "Nouvelle commande reçue !" et joue le son
      deactivate AdminFront
    end
  end

  Back-->>FrontC: Retourne 201 Created { commande: { id: orderId, status: 'en_attente' } }
  deactivate Back
  FrontC->>FrontC: Vide le panier d'achat local (setCart([]))
  FrontC->>Client: Redirige vers la vue "Mes Commandes" avec message de succès
```
