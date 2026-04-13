-- Migration 011 : ajout colonne est_nouveau sur produit
-- Permet d'afficher un badge "Nouveau" sur les produits récents

ALTER TABLE produit ADD COLUMN est_nouveau BOOLEAN NOT NULL DEFAULT FALSE;
