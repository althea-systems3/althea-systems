export type UserStatus = 'actif' | 'inactif' | 'en_attente'
export type CategoryStatus = 'active' | 'inactive'
export type TVARate = '20' | '10' | '5.5' | '0'
export type ProductStatus = 'publie' | 'brouillon'

export interface Utilisateur {
  id_utilisateur: string
  email: string
  nom_complet: string
  statut: UserStatus
  est_admin: boolean
  email_verifie: boolean
  date_inscription: string
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
