-- Ajout des champs nécessaires à la réinitialisation de mot de passe

ALTER TABLE utilisateur
  ADD COLUMN reset_token_hash TEXT,
  ADD COLUMN reset_token_expires_at TIMESTAMPTZ;
