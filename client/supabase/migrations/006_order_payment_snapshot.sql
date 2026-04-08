-- ============================================
-- Migration 006 : Snapshot paiement sur commande
-- ============================================

ALTER TABLE commande
  ADD COLUMN mode_paiement TEXT,
  ADD COLUMN paiement_dernier_4 TEXT;

ALTER TABLE commande
  ADD CONSTRAINT commande_mode_paiement_check
  CHECK (mode_paiement IS NULL OR mode_paiement IN ('carte'));

ALTER TABLE commande
  ADD CONSTRAINT commande_paiement_dernier_4_check
  CHECK (
    paiement_dernier_4 IS NULL
    OR paiement_dernier_4 ~ '^[0-9]{4}$'
  );
