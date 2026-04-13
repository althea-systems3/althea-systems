-- Migration 013 : table dédiée password_reset_token
-- Sépare les tokens de réinitialisation de la table utilisateur
-- pour une meilleure séparation des responsabilités et support multi-tokens

CREATE TABLE password_reset_token (
  id_token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_utilisateur UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  utilise BOOLEAN NOT NULL DEFAULT FALSE,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_token_utilisateur ON password_reset_token(id_utilisateur);
CREATE INDEX idx_password_reset_token_hash ON password_reset_token(token_hash);
