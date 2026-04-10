-- ============================================
-- Migration 008 : Pages statiques éditoriales
-- ============================================

CREATE TABLE IF NOT EXISTS page_statique (
  id_page UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL CHECK (slug IN ('cgu', 'mentions-legales', 'a-propos')),
  locale TEXT NOT NULL CHECK (locale IN ('fr', 'en', 'ar', 'es')),
  titre TEXT NOT NULL,
  description TEXT,
  contenu_markdown TEXT NOT NULL,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_statique_slug_locale
  ON page_statique (slug, locale);

ALTER TABLE page_statique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_statique_lecture_publique"
  ON page_statique FOR SELECT
  USING (TRUE);

INSERT INTO page_statique (slug, locale, titre, description, contenu_markdown, date_mise_a_jour)
VALUES
  (
    'cgu',
    'fr',
    'Conditions Generales d''Utilisation',
    'Consultez ici l''ensemble des conditions applicables a l''utilisation du site Althea Systems.',
    '## Objet\nLes presentes conditions encadrent l''utilisation du site Althea Systems.\n\n## Utilisation\n- L''utilisateur conserve la confidentialite de ses identifiants.\n- Toute action effectuee depuis le compte est presumee validee par son titulaire.\n\n## Contact\nPour toute question, consultez [la page de contact](/contact).',
    NOW()
  ),
  (
    'mentions-legales',
    'fr',
    'Mentions legales',
    'Retrouvez les informations juridiques et editoriales du site e-commerce.',
    '## Editeur\nAlthea Systems SAS\n\n## Hebergement\nLe site est heberge sur une infrastructure cloud securisee.\n\n## Donnees personnelles\nLes traitements de donnees sont effectues selon la reglementation applicable.\n\n## Contact\nPour toute demande, utilisez [la page de contact](/contact).',
    NOW()
  ),
  (
    'a-propos',
    'fr',
    'A propos de Althea Systems',
    'Althea Systems accompagne les entreprises avec une plateforme e-commerce performante et evolutive.',
    '## Notre mission\nAlthea Systems accompagne les structures de sante avec une experience d''achat fiable.\n\n## Notre engagement\n- Qualite de service\n- Rigueur operationnelle\n- Support reactif\n\n## Aller plus loin\nDecouvrez [notre catalogue](/catalogue) ou [contactez-nous](/contact).',
    NOW()
  )
ON CONFLICT (slug, locale) DO NOTHING;
