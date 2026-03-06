-- ============================================
-- Migration 001 : Tables pour le layout global
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- ENUMS
-- =====================

-- NOTE: On utilise des CHECK constraints plutôt que des types ENUM PostgreSQL
-- car ils sont plus simples à modifier sans migration lourde.

-- =====================
-- TABLE : utilisateur
-- =====================
-- Profil applicatif lié à Supabase Auth.
-- Créé automatiquement via trigger à l'inscription.

CREATE TABLE utilisateur (
  id_utilisateur UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nom_complet TEXT NOT NULL DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('actif', 'inactif', 'en_attente')),
  est_admin BOOLEAN NOT NULL DEFAULT FALSE,
  email_verifie BOOLEAN NOT NULL DEFAULT FALSE,
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE utilisateur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilisateur_lecture_propre_profil"
  ON utilisateur FOR SELECT
  USING (id_utilisateur = auth.uid());

-- =====================
-- TABLE : categorie
-- =====================

CREATE TABLE categorie (
  id_categorie UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  ordre_affiche INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'active'
    CHECK (statut IN ('active', 'inactive')),
  image_url TEXT
);

-- NOTE: Index partiel pour la requête du menu nav (< 100ms)
CREATE INDEX idx_categorie_menu
  ON categorie (ordre_affiche)
  WHERE statut = 'active';

ALTER TABLE categorie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorie_lecture_publique"
  ON categorie FOR SELECT
  USING (true);

-- =====================
-- TABLE : produit
-- =====================
-- Nécessaire pour le calcul du prix total panier.

CREATE TABLE produit (
  id_produit UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  caracteristique_tech JSONB,
  prix_ht NUMERIC(10,2) NOT NULL,
  tva TEXT NOT NULL DEFAULT '20'
    CHECK (tva IN ('20', '10', '5.5', '0')),
  prix_ttc NUMERIC(10,2) NOT NULL,
  quantite_stock INTEGER NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('publie', 'brouillon')),
  slug TEXT UNIQUE NOT NULL,
  priorite INTEGER NOT NULL DEFAULT 0,
  est_top_produit BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE produit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produit_lecture_publique_publie"
  ON produit FOR SELECT
  USING (statut = 'publie');

-- =====================
-- TABLE : produit_categorie
-- =====================

CREATE TABLE produit_categorie (
  id_produit UUID NOT NULL REFERENCES produit(id_produit) ON DELETE CASCADE,
  id_categorie UUID NOT NULL REFERENCES categorie(id_categorie) ON DELETE CASCADE,
  PRIMARY KEY (id_produit, id_categorie)
);

-- =====================
-- TABLE : panier
-- =====================
-- Supporte les guests (session_id) et les users connectés (id_utilisateur).

CREATE TABLE panier (
  id_panier UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_utilisateur UUID REFERENCES utilisateur(id_utilisateur) ON DELETE SET NULL,
  session_id TEXT,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT panier_doit_avoir_proprietaire
    CHECK (id_utilisateur IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_panier_par_session
  ON panier (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX idx_panier_par_utilisateur
  ON panier (id_utilisateur)
  WHERE id_utilisateur IS NOT NULL;

ALTER TABLE panier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "panier_lecture_proprietaire"
  ON panier FOR SELECT
  USING (id_utilisateur = auth.uid());

CREATE POLICY "panier_ecriture_proprietaire"
  ON panier FOR ALL
  USING (id_utilisateur = auth.uid());

-- =====================
-- TABLE : ligne_panier
-- =====================

CREATE TABLE ligne_panier (
  id_ligne_panier UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_panier UUID NOT NULL REFERENCES panier(id_panier) ON DELETE CASCADE,
  id_produit UUID NOT NULL REFERENCES produit(id_produit) ON DELETE CASCADE,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  UNIQUE (id_panier, id_produit)
);

CREATE INDEX idx_ligne_panier_par_panier
  ON ligne_panier (id_panier);

ALTER TABLE ligne_panier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ligne_panier_via_proprietaire_panier"
  ON ligne_panier FOR ALL
  USING (
    id_panier IN (
      SELECT id_panier FROM panier WHERE id_utilisateur = auth.uid()
    )
  );

-- =====================
-- TRIGGER : auto-création utilisateur à l'inscription Supabase Auth
-- =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.utilisateur (
    id_utilisateur,
    email,
    nom_complet,
    email_verifie
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom_complet', ''),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
