-- ============================================================================
-- Migration 017 : Toggle actif/inactif sur contenu_editorial
-- ============================================================================
--
-- Permet de désactiver l'affichage public d'un contenu éditorial sans le
-- supprimer. Utile pour le bloc "Informations importantes" qui doit être
-- masqué quand il n'y a rien à communiquer.
-- ============================================================================

ALTER TABLE contenu_editorial
  ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT FALSE;

-- Note : par défaut FALSE — les contenus existants sont désactivés.
-- L'admin doit cocher "Activer" explicitement depuis le backoffice.
