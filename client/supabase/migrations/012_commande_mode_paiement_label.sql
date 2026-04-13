-- Migration 012 : ajout colonne mode_paiement_label sur commande
-- Stocke un label lisible du mode de paiement (ex. "Visa •••• 1234")

ALTER TABLE commande ADD COLUMN mode_paiement_label TEXT DEFAULT NULL;
