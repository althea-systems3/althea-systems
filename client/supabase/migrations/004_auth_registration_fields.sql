-- Ajout des champs nécessaires à la vérification email et RGPD

ALTER TABLE utilisateur
  ADD COLUMN validation_token_hash TEXT,
  ADD COLUMN validation_token_expires_at TIMESTAMPTZ,
  ADD COLUMN date_validation_email TIMESTAMPTZ,
  ADD COLUMN cgu_acceptee_le TIMESTAMPTZ;
