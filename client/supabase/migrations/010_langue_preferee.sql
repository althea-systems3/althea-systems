-- Ajout de la préférence de langue utilisateur
ALTER TABLE utilisateur
ADD COLUMN langue_preferee TEXT NOT NULL DEFAULT 'fr';
