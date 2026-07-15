'use strict';
const jwt = require('jsonwebtoken');

// Vérifie le token JWT et place l'utilisateur dans req.utilisateur
function authentifier(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erreur: 'Token manquant' });
  try {
    req.utilisateur = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erreur: 'Token invalide ou expiré' });
  }
}

// Réserve une route à l'administrateur
function exigerAdmin(req, res, next) {
  if (!req.utilisateur || req.utilisateur.role !== 'admin') {
    return res.status(403).json({ erreur: "Accès réservé à l'administrateur" });
  }
  next();
}

module.exports = { authentifier, exigerAdmin };
