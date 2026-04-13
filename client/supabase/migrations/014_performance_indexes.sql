-- Migration 014 : index de performance
-- Accélère les filtres fréquents dans les listes admin et les requêtes publiques

CREATE INDEX IF NOT EXISTS idx_commande_statut ON commande(statut);
CREATE INDEX IF NOT EXISTS idx_commande_statut_paiement ON commande(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_commande_date ON commande(date_commande);
CREATE INDEX IF NOT EXISTS idx_facture_statut ON facture(statut);
CREATE INDEX IF NOT EXISTS idx_produit_statut ON produit(statut);
CREATE INDEX IF NOT EXISTS idx_produit_est_top ON produit(est_top_produit) WHERE est_top_produit = TRUE;
CREATE INDEX IF NOT EXISTS idx_produit_est_nouveau ON produit(est_nouveau) WHERE est_nouveau = TRUE;
CREATE INDEX IF NOT EXISTS idx_utilisateur_statut ON utilisateur(statut);
