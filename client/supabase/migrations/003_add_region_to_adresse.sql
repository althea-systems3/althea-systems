-- ============================================
-- Migration 003 : Ajout colonne region à adresse
-- ============================================
-- Le cahier des charges mentionne la région dans l'adresse.
-- Ajout d'une colonne optionnelle pour aligner base et CDC.

ALTER TABLE adresse
  ADD COLUMN region TEXT;
