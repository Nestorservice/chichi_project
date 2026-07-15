'use strict';
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { authentifier, exigerAdmin } = require('./middleware/auth');
const { champsImages } = require('./middleware/upload');
const auth = require('./controllers/authController');
const produits = require('./controllers/productController');
const commandes = require('./controllers/orderController');
const chat = require('./controllers/chatController');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.post('/api/auth/inscription', auth.inscription);
app.post('/api/auth/connexion', auth.connexion);
app.get('/api/auth/profil', authentifier, auth.profil);

app.get('/api/products', produits.listerProduits);
app.get('/api/products/:id', produits.detailProduit);

app.get('/api/admin/products', authentifier, exigerAdmin, produits.listerTous);
app.post('/api/admin/products', authentifier, exigerAdmin, champsImages, produits.creerProduit);
app.put('/api/admin/products/:id', authentifier, exigerAdmin, champsImages, produits.modifierProduit);
app.delete('/api/admin/products/:id', authentifier, exigerAdmin, produits.supprimerProduit);
app.delete('/api/admin/images/:id', authentifier, exigerAdmin, produits.supprimerImage);

app.post('/api/orders', authentifier, commandes.passerCommande);
app.get('/api/orders', authentifier, commandes.mesCommandes);
app.get('/api/orders/stream', commandes.streamCommandes);
app.put('/api/orders/:id/delivery-location', authentifier, commandes.definirChoixLivraison);
app.get('/api/admin/orders', authentifier, exigerAdmin, commandes.toutesCommandes);
app.put('/api/admin/orders/:id/status', authentifier, exigerAdmin, commandes.changerStatut);
app.post('/api/orders/:id/review', authentifier, commandes.ajouterAvis);
app.get('/api/admin/reviews', authentifier, exigerAdmin, commandes.listerAvis);

app.post('/api/chat', chat.discuter);

app.get('/', (_req, res) => res.json({ service: 'API Restauration Cameroun', statut: 'ok' }));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`API démarrée sur le port ${PORT}`));
}

module.exports = app;
