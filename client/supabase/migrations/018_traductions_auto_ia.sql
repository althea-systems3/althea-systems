-- ============================================
-- Migration 018 : Traductions auto par IA
-- ============================================
-- Ajoute source_locale + traductions JSONB aux entités texte qui n'ont pas
-- déjà un pattern multi-row (page_statique et contenu_editorial conservent
-- leur structure 1-ligne-par-locale, on duplique les rows à la sauvegarde).
--
-- La langue source est détectée automatiquement à la première sauvegarde
-- via Groq. Les colonnes nom/description/etc. existantes contiennent
-- la version source, traductions[locale] contient les autres langues.

-- ----------------------------
-- produit
-- ----------------------------
ALTER TABLE produit
  ADD COLUMN IF NOT EXISTS source_locale TEXT NOT NULL DEFAULT 'fr'
    CHECK (source_locale IN ('fr', 'en', 'es', 'ar'));

ALTER TABLE produit
  ADD COLUMN IF NOT EXISTS traductions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN produit.traductions IS
  'Traductions auto par IA. Structure: { "<locale>": { "nom": "...", "description": "...", "caracteristique_tech": {...} } }';

-- ----------------------------
-- categorie
-- ----------------------------
ALTER TABLE categorie
  ADD COLUMN IF NOT EXISTS source_locale TEXT NOT NULL DEFAULT 'fr'
    CHECK (source_locale IN ('fr', 'en', 'es', 'ar'));

ALTER TABLE categorie
  ADD COLUMN IF NOT EXISTS traductions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN categorie.traductions IS
  'Traductions auto par IA. Structure: { "<locale>": { "nom": "...", "description": "..." } }';

-- ----------------------------
-- carrousel
-- ----------------------------
ALTER TABLE carrousel
  ADD COLUMN IF NOT EXISTS source_locale TEXT NOT NULL DEFAULT 'fr'
    CHECK (source_locale IN ('fr', 'en', 'es', 'ar'));

ALTER TABLE carrousel
  ADD COLUMN IF NOT EXISTS traductions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN carrousel.traductions IS
  'Traductions auto par IA. Structure: { "<locale>": { "titre": "...", "texte": "..." } }';
