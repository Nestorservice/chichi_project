-- =====================================================================
--  Plateforme de restauration camerounaise — Modèle de données
--  MySQL 8.0+
--
--  Principe central : chaque plat porte un PROFIL NUTRITIONNEL.
--  Le backend en DÉDUIT automatiquement des "tags santé" (table
--  product_health_tags) qui servent au filtrage par profil utilisateur.
-- =====================================================================

-- ---------- UTILISATEURS & PROFIL SANTÉ ----------
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(160) UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Un utilisateur peut cumuler plusieurs conditions (ex. diabétique ET sportif)
CREATE TABLE user_health_conditions (
  user_id BIGINT,
  `condition` ENUM('diabetique','sportif','minceur','hypertension','vegetarien','vegan','sans_gluten') NOT NULL,
  PRIMARY KEY (user_id, `condition`),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_allergies (
  user_id BIGINT,
  allergen ENUM('arachide','gluten','lactose','oeuf','poisson','fruits_de_mer','soja','porc') NOT NULL,
  PRIMARY KEY (user_id, allergen),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- CATALOGUE ----------
CREATE TABLE chefs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  bio TEXT
);

CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL
);

CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  price_fcfa INT NOT NULL CHECK (price_fcfa >= 0),
  category_id BIGINT,
  chef_id BIGINT,
  cuisine ENUM('camerounais', 'fastfood', 'boisson', 'dessert') NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  -- Régimes : NON déductibles de la nutrition, donc saisis par l'admin
  is_vegetarian BOOLEAN NOT NULL DEFAULT FALSE,
  is_vegan BOOLEAN NOT NULL DEFAULT FALSE,
  is_gluten_free BOOLEAN NOT NULL DEFAULT FALSE,
  nutritionist_validated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (chef_id) REFERENCES chefs(id)
);

-- Profil nutritionnel (1 ligne par plat) — saisi par l'admin
CREATE TABLE product_nutrition (
  product_id BIGINT PRIMARY KEY,
  portion_g INT,
  calories_kcal DECIMAL(7,2),
  carbs_g DECIMAL(6,2),
  sugars_g DECIMAL(6,2),
  protein_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  fiber_g DECIMAL(6,2),
  sodium_mg DECIMAL(7,2),
  glycemic_index INT CHECK (glycemic_index BETWEEN 0 AND 110),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_allergens (
  product_id BIGINT,
  allergen ENUM('arachide','gluten','lactose','oeuf','poisson','fruits_de_mer','soja','porc') NOT NULL,
  PRIMARY KEY (product_id, allergen),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Tags santé CALCULÉS par le moteur (jamais saisis à la main)
CREATE TABLE product_health_tags (
  product_id BIGINT,
  tag ENUM('diabetique_compatible','sportif','minceur','hypertension_compatible','riche_proteines','faible_calorie','vegetarien','vegan','sans_gluten') NOT NULL,
  PRIMARY KEY (product_id, tag),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ---------- COMMANDES ----------
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,
  status ENUM('en_attente','confirmee','en_preparation','en_livraison','livree','annulee') NOT NULL DEFAULT 'en_attente',
  total_fcfa INT NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  payment_method ENUM('mtn_momo','orange_money','a_la_livraison') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT,
  product_id BIGINT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_fcfa INT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------- INDEX (performance du filtrage) ----------
CREATE INDEX idx_health_tags_tag ON product_health_tags(tag);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_product_allergens ON product_allergens(allergen);
CREATE INDEX idx_orders_user ON orders(user_id);

-- =====================================================================
--  DONNÉES DE DÉMONSTRATION (base fraîche : les id suivent l'ordre 1..N)
-- =====================================================================
INSERT INTO categories (name) VALUES ('Plats camerounais'), ('Fast-food'), ('Boissons');

INSERT INTO chefs (name, bio) VALUES
  ('Chef Aïcha',  'Spécialiste de la cuisine camerounaise allégée.'),
  ('Chef Bertin', 'Cuisine fusion et fast-food maison.');

INSERT INTO products (name, description, price_fcfa, category_id, chef_id, cuisine, is_vegetarian, is_vegan, is_gluten_free, nutritionist_validated) VALUES
  ('Ndolè aux crevettes',   'Ndolè revisité, peu salé, riche en protéines.', 3000, 1, 1, 'camerounais', FALSE, FALSE, FALSE, TRUE),
  ('Poulet DG allégé',      'Poulet DG cuit sans excès d''huile.',          3500, 1, 2, 'camerounais', FALSE, FALSE, FALSE, TRUE),
  ('Eru végétarien',        'Eru sans viande, légumes et huile de palme.',   2500, 1, 1, 'camerounais', TRUE,  FALSE, FALSE, TRUE),
  ('Burger maison',         'Burger bœuf, fromage, pain brioché.',           2800, 2, 2, 'fastfood',    FALSE, FALSE, FALSE, FALSE),
  ('Salade composée végane','Crudités, pois chiches, vinaigrette légère.',   2000, 2, 1, 'fastfood',    TRUE,  TRUE,  TRUE,  TRUE),
  ('Jus de gingembre',      'Jus de gingembre maison sucré au naturel.',     1000, 3, 1, 'boisson',     TRUE,  TRUE,  TRUE,  FALSE);

INSERT INTO product_nutrition (product_id, portion_g, calories_kcal, carbs_g, sugars_g, protein_g, fat_g, fiber_g, sodium_mg, glycemic_index) VALUES
  (1, 350, 350, 20, 5, 25, 14, 6, 420, 40),
  (2, 400, 380, 30, 8, 28, 16, 5, 480, 50),
  (3, 300, 250, 18, 4, 12, 12, 8, 450, 35),
  (4, 280, 820, 55, 16, 30, 45, 3, 1050, 72),
  (5, 250, 210, 22, 7, 9, 10, 7, 280, 30),
  (6, 250,  90, 22, 20, 0,  0, 1, 10, 60);

INSERT INTO product_allergens (product_id, allergen) VALUES
  (1, 'fruits_de_mer'),
  (4, 'gluten'), (4, 'lactose');

INSERT INTO product_health_tags (product_id, tag) VALUES
  (1,'diabetique_compatible'),(1,'minceur'),(1,'faible_calorie'),(1,'sportif'),(1,'riche_proteines'),(1,'hypertension_compatible'),
  (2,'diabetique_compatible'),(2,'minceur'),(2,'faible_calorie'),(2,'sportif'),(2,'riche_proteines'),(2,'hypertension_compatible'),
  (3,'diabetique_compatible'),(3,'minceur'),(3,'faible_calorie'),(3,'hypertension_compatible'),(3,'vegetarien'),
  (4,'sportif'),(4,'riche_proteines'),
  (5,'diabetique_compatible'),(5,'minceur'),(5,'faible_calorie'),(5,'hypertension_compatible'),(5,'vegetarien'),(5,'vegan'),(5,'sans_gluten'),
  (6,'minceur'),(6,'faible_calorie'),(6,'hypertension_compatible'),(6,'vegetarien'),(6,'vegan'),(6,'sans_gluten');