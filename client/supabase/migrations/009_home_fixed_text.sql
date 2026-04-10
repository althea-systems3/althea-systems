-- ============================================
-- Migration 009 : Texte fixe home editorial
-- ============================================

CREATE TABLE IF NOT EXISTS contenu_editorial (
  id_contenu UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('fr', 'en', 'ar', 'es')),
  titre TEXT,
  contenu_markdown TEXT NOT NULL DEFAULT '',
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contenu_editorial_slug_locale
  ON contenu_editorial (slug, locale);

ALTER TABLE contenu_editorial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contenu_editorial_lecture_publique"
  ON contenu_editorial FOR SELECT
  USING (TRUE);

INSERT INTO contenu_editorial (slug, locale, titre, contenu_markdown, date_mise_a_jour)
VALUES
  (
    'texte-fixe-home',
    'fr',
    'Informations importantes',
    'Ce bloc est modifiable depuis le backoffice pour diffuser des informations utiles.\n\nUtilisez **le gras**, *l''italique* et des [liens clairs](/contact) pour guider vos clients.',
    NOW()
  )
ON CONFLICT (slug, locale) DO NOTHING;