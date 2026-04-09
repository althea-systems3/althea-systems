-- =========================================================
-- Migration 007 : Lier historique_statut a l utilisateur admin
-- =========================================================

ALTER TABLE historique_statut
  ADD COLUMN IF NOT EXISTS id_admin_modification UUID REFERENCES utilisateur(id_utilisateur) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS historique_statut_id_admin_modification_idx
  ON historique_statut (id_admin_modification);
