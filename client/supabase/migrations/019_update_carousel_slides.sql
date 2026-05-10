-- ============================================
-- Migration 019 : Mise a jour contenu slides carrousel
-- ============================================
-- - Slide "Materiel Medical" : ajout d'une description (texte)
-- - Slide "Reseaux Industriels Fiables" : remplace par "Materiel certifie CE"
--   + nouvelle description + suppression du lien (pas de bouton Decouvrir)
-- - Reset traductions JSONB pour ces slides : seront re-generees par IA
--   au prochain "Re-traduire" admin ou via /api/admin/translate/backfill.

UPDATE carrousel
SET
  texte = 'Decouvrez notre catalogue complet d''equipements medicaux professionnels.',
  source_locale = 'fr',
  traductions = '{}'::jsonb
WHERE titre ILIKE 'Materiel Medical' OR titre ILIKE 'Mat%riel M%dical';

UPDATE carrousel
SET
  titre = 'Materiel certifie CE',
  texte = 'Des equipements conformes aux normes europeennes.',
  lien_redirection = NULL,
  source_locale = 'fr',
  traductions = '{}'::jsonb
WHERE titre ILIKE 'Reseaux Industriels Fiables' OR titre ILIKE 'R%seaux Industriels%';
