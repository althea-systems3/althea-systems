-- ============================================
-- Migration 002 : Tables restantes
-- ============================================

-- =====================
-- TABLE : adresse
-- =====================
-- Un utilisateur peut avoir 0..* adresses.

CREATE TABLE adresse (
  id_adresse UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_utilisateur UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  adresse_1 TEXT NOT NULL,
  adresse_2 TEXT,
  ville TEXT NOT NULL,
  code_postal TEXT NOT NULL,
  pays TEXT NOT NULL DEFAULT 'France',
  telephone TEXT
);

CREATE INDEX idx_adresse_par_utilisateur
  ON adresse (id_utilisateur);

ALTER TABLE adresse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adresse_lecture_proprietaire"
  ON adresse FOR SELECT
  USING (id_utilisateur = auth.uid());

CREATE POLICY "adresse_ecriture_proprietaire"
  ON adresse FOR ALL
  USING (id_utilisateur = auth.uid());

-- =====================
-- TABLE : methode_paiement
-- =====================
-- Un utilisateur peut avoir 0..* méthodes de paiement.

CREATE TABLE methode_paiement (
  id_paiement UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_utilisateur UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
  nom_carte TEXT NOT NULL,
  derniers_4_chiffres TEXT NOT NULL CHECK (LENGTH(derniers_4_chiffres) = 4),
  date_expiration TEXT NOT NULL,
  stripe_payment_id TEXT NOT NULL,
  est_defaut BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_methode_paiement_par_utilisateur
  ON methode_paiement (id_utilisateur);

ALTER TABLE methode_paiement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "methode_paiement_lecture_proprietaire"
  ON methode_paiement FOR SELECT
  USING (id_utilisateur = auth.uid());

CREATE POLICY "methode_paiement_ecriture_proprietaire"
  ON methode_paiement FOR ALL
  USING (id_utilisateur = auth.uid());

-- =====================
-- TABLE : commande
-- =====================

CREATE TABLE commande (
  id_commande UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_commande TEXT UNIQUE NOT NULL,
  id_utilisateur UUID NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE RESTRICT,
  id_adresse UUID NOT NULL REFERENCES adresse(id_adresse) ON DELETE RESTRICT,
  date_commande TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  montant_ht NUMERIC(10,2) NOT NULL,
  montant_tva NUMERIC(10,2) NOT NULL,
  montant_ttc NUMERIC(10,2) NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'en_cours', 'terminee', 'annulee')),
  statut_paiement TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut_paiement IN ('valide', 'en_attente', 'echoue', 'rembourse'))
);

CREATE INDEX idx_commande_par_utilisateur
  ON commande (id_utilisateur);

ALTER TABLE commande ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commande_lecture_proprietaire"
  ON commande FOR SELECT
  USING (id_utilisateur = auth.uid());

-- =====================
-- TABLE : ligne_commande
-- =====================

CREATE TABLE ligne_commande (
  id_ligne UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_commande UUID NOT NULL REFERENCES commande(id_commande) ON DELETE CASCADE,
  id_produit UUID NOT NULL REFERENCES produit(id_produit) ON DELETE RESTRICT,
  quantite INTEGER NOT NULL CHECK (quantite > 0),
  prix_unitaire_ht NUMERIC(10,2) NOT NULL,
  prix_total_ttc NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_ligne_commande_par_commande
  ON ligne_commande (id_commande);

ALTER TABLE ligne_commande ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ligne_commande_via_proprietaire_commande"
  ON ligne_commande FOR SELECT
  USING (
    id_commande IN (
      SELECT id_commande FROM commande WHERE id_utilisateur = auth.uid()
    )
  );

-- =====================
-- TABLE : historique_statut
-- =====================
-- Suivi des changements de statut d'une commande.

CREATE TABLE historique_statut (
  id_historique UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_commande UUID NOT NULL REFERENCES commande(id_commande) ON DELETE CASCADE,
  statut_precedent TEXT NOT NULL,
  nouveau_statut TEXT NOT NULL,
  date_changement TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historique_par_commande
  ON historique_statut (id_commande);

ALTER TABLE historique_statut ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historique_statut_via_proprietaire_commande"
  ON historique_statut FOR SELECT
  USING (
    id_commande IN (
      SELECT id_commande FROM commande WHERE id_utilisateur = auth.uid()
    )
  );

-- =====================
-- TABLE : facture
-- =====================
-- Une commande a 0..1 facture.

CREATE TABLE facture (
  id_facture UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_facture TEXT UNIQUE NOT NULL,
  id_commande UUID NOT NULL REFERENCES commande(id_commande) ON DELETE RESTRICT,
  date_emission TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  montant_ttc NUMERIC(10,2) NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('payee', 'en_attente', 'annule')),
  pdf_url TEXT
);

CREATE INDEX idx_facture_par_commande
  ON facture (id_commande);

ALTER TABLE facture ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facture_via_proprietaire_commande"
  ON facture FOR SELECT
  USING (
    id_commande IN (
      SELECT id_commande FROM commande WHERE id_utilisateur = auth.uid()
    )
  );

-- =====================
-- TABLE : avoir
-- =====================
-- Une facture peut avoir 0..* avoirs.

CREATE TABLE avoir (
  id_avoir UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_avoir TEXT UNIQUE NOT NULL,
  id_facture UUID NOT NULL REFERENCES facture(id_facture) ON DELETE RESTRICT,
  date_emission TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  montant NUMERIC(10,2) NOT NULL,
  motif TEXT NOT NULL
    CHECK (motif IN ('annulation', 'remboursement', 'erreur')),
  pdf_url TEXT
);

CREATE INDEX idx_avoir_par_facture
  ON avoir (id_facture);

ALTER TABLE avoir ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avoir_via_proprietaire_facture"
  ON avoir FOR SELECT
  USING (
    id_facture IN (
      SELECT f.id_facture FROM facture f
      JOIN commande c ON c.id_commande = f.id_commande
      WHERE c.id_utilisateur = auth.uid()
    )
  );

-- =====================
-- TABLE : message_contact
-- =====================

CREATE TABLE message_contact (
  id_message UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  sujet TEXT NOT NULL,
  contenu TEXT NOT NULL,
  date_envoie TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  est_traite BOOLEAN NOT NULL DEFAULT FALSE,
  id_admin_traitement UUID REFERENCES utilisateur(id_utilisateur) ON DELETE SET NULL
);

ALTER TABLE message_contact ENABLE ROW LEVEL SECURITY;

-- Pas de policy SELECT publique : seuls les admins lisent les messages.
-- Les policies admin seront gérées via un rôle service_role ou une policy dédiée.

-- =====================
-- TABLE : carrousel
-- =====================

CREATE TABLE carrousel (
  id_slide UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre TEXT NOT NULL,
  texte TEXT,
  lien_redirection TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT
);

CREATE INDEX idx_carrousel_actif
  ON carrousel (ordre)
  WHERE actif = TRUE;

ALTER TABLE carrousel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carrousel_lecture_publique"
  ON carrousel FOR SELECT
  USING (actif = TRUE);
