export type UserStatus = "actif" | "inactif" | "en_attente"
export type CategoryStatus = "active" | "inactive"
export type TVARate = "20" | "10" | "5.5" | "0"
export type ProductStatus = "publie" | "brouillon"
export type OrderStatus = "en_attente" | "en_cours" | "terminee" | "annulee"
export type PaymentStatus = "valide" | "en_attente" | "echoue" | "rembourse"
export type InvoiceStatus = "payee" | "en_attente" | "annule"
export type CreditNoteReason = "annulation" | "remboursement" | "erreur"

export interface Utilisateur {
  id_utilisateur: string
  email: string
  nom_complet: string
  statut: UserStatus
  est_admin: boolean
  email_verifie: boolean
  date_inscription: string
  validation_token_hash: string | null
  validation_token_expires_at: string | null
  date_validation_email: string | null
  cgu_acceptee_le: string | null
  reset_token_hash: string | null
  reset_token_expires_at: string | null
}

export interface Categorie {
  id_categorie: string
  nom: string
  description: string | null
  slug: string
  ordre_affiche: number
  statut: CategoryStatus
  image_url: string | null
}

export interface Produit {
  id_produit: string
  nom: string
  description: string | null
  caracteristique_tech: Record<string, unknown> | null
  prix_ht: number
  tva: TVARate
  prix_ttc: number
  quantite_stock: number
  statut: ProductStatus
  slug: string
  priorite: number
  est_top_produit: boolean
}

export interface Carrousel {
  id_slide: string
  titre: string
  texte: string | null
  lien_redirection: string | null
  ordre: number
  actif: boolean
  image_url: string | null
}

export interface Panier {
  id_panier: string
  id_utilisateur: string | null
  session_id: string | null
  date_creation: string
}

export interface LignePanier {
  id_ligne_panier: string
  id_panier: string
  id_produit: string
  quantite: number
}

export interface ProduitCategorie {
  id_produit: string
  id_categorie: string
}

export interface Adresse {
  id_adresse: string
  id_utilisateur: string
  prenom: string
  nom: string
  adresse_1: string
  adresse_2: string | null
  ville: string
  region: string | null
  code_postal: string
  pays: string
  telephone: string | null
}

export interface MethodePaiement {
  id_paiement: string
  id_utilisateur: string
  nom_carte: string
  derniers_4_chiffres: string
  date_expiration: string
  stripe_payment_id: string
  est_defaut: boolean
}

export interface Commande {
  id_commande: string
  numero_commande: string
  id_utilisateur: string
  id_adresse: string
  date_commande: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  statut: OrderStatus
  statut_paiement: PaymentStatus
  mode_paiement: string | null
  paiement_dernier_4: string | null
}

export interface LigneCommande {
  id_ligne: string
  id_commande: string
  id_produit: string
  quantite: number
  prix_unitaire_ht: number
  prix_total_ttc: number
}

export interface HistoriqueStatut {
  id_historique: string
  id_commande: string
  statut_precedent: string
  nouveau_statut: string
  date_changement: string
}

export interface Facture {
  id_facture: string
  numero_facture: string
  id_commande: string
  date_emission: string
  montant_ttc: number
  statut: InvoiceStatus
  pdf_url: string | null
}

export interface Avoir {
  id_avoir: string
  numero_avoir: string
  id_facture: string
  date_emission: string
  montant: number
  motif: CreditNoteReason
  pdf_url: string | null
}

// NOTE: Type Database minimal pour typer le client Supabase.
// Remplacer par les types auto-générés (npx supabase gen types)
// une fois le projet connecté à Supabase.

type TableHelper<TRow, TInsert = Partial<TRow>> = {
  Row: TRow
  Insert: TInsert
  Update: Partial<TRow>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      utilisateur: TableHelper<Utilisateur>
      categorie: TableHelper<Categorie>
      produit: TableHelper<Produit>
      panier: TableHelper<Panier>
      ligne_panier: TableHelper<LignePanier>
      carrousel: TableHelper<Carrousel>
      produit_categorie: TableHelper<ProduitCategorie>
      adresse: TableHelper<Adresse>
      methode_paiement: TableHelper<MethodePaiement>
      commande: TableHelper<Commande>
      ligne_commande: TableHelper<LigneCommande>
      historique_statut: TableHelper<HistoriqueStatut>
      facture: TableHelper<Facture>
      avoir: TableHelper<Avoir>
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Views: {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Functions: {}
  }
}
