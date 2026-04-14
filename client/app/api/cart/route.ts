import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { getCartSessionId } from "@/lib/auth/cartSession"
import { FIRESTORE_IMAGES_PRODUITS } from "@/lib/top-produits/constants"
import {
  CART_API_ENV_KEYS,
  createConfigurationMissingApiPayload,
  isMissingRuntimeConfigError,
  logMissingRuntimeConfig,
  validateRuntimeConfig,
} from "@/lib/config/runtime"
import type { Panier } from "@/lib/supabase/types"

const FIRESTORE_IN_QUERY_LIMIT = 30

export const dynamic = "force-dynamic"

type CartLineRow = {
  id_ligne_panier: string
  id_panier: string
  id_produit: string
  quantite: number
  produit: {
    nom: string
    slug: string
    prix_ttc: number
    quantite_stock: number
    statut: string
  } | null
}

type CartLinePayload = {
  id: string
  productId: string
  name: string
  slug: string
  priceTtc: number
  quantity: number
  stockQuantity: number
  isAvailable: boolean
  isStockSufficient: boolean
  subtotalTtc: number
  imageUrl: string | null
}

type FirestoreImageDoc = {
  produit_id: string
  images: { url: string; est_principale: boolean }[]
}

// --- Panier lookup ---

async function fetchCartByUser(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("panier")
    .select("id_panier")
    .eq("id_utilisateur", userId)
    .limit(1)
    .single()

  return data ? (data as Panier).id_panier : null
}

async function fetchCartBySession(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  sessionId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("panier")
    .select("id_panier")
    .eq("session_id", sessionId)
    .limit(1)
    .single()

  return data ? (data as Panier).id_panier : null
}

// --- Cart lines ---

async function fetchCartLines(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
): Promise<CartLineRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ligne_panier")
    .select(
      "id_ligne_panier, id_panier, id_produit, quantite, produit:id_produit(nom, slug, prix_ttc, quantite_stock, statut)",
    )
    .eq("id_panier", cartId)

  if (error || !data) {
    return []
  }

  return data as unknown as CartLineRow[]
}

// --- Images Firestore ---

function extractMainImageUrl(imageDoc: FirestoreImageDoc): string | null {
  const mainImage = imageDoc.images?.find((img) => img.est_principale)
  return mainImage?.url ?? imageDoc.images?.[0]?.url ?? null
}

async function fetchProductImages(
  productIds: string[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()

  if (productIds.length === 0) {
    return imageMap
  }

  try {
    const firestore = getFirestoreClient()

    for (let i = 0; i < productIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
      const batch = productIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT)

      const snapshot = await firestore
        .collection(FIRESTORE_IMAGES_PRODUITS)
        .where("produit_id", "in", batch)
        .get()

      snapshot.docs.forEach((doc) => {
        const imageDoc = doc.data() as FirestoreImageDoc
        const imageUrl = extractMainImageUrl(imageDoc)

        if (imageUrl) {
          imageMap.set(imageDoc.produit_id, imageUrl)
        }
      })
    }
  } catch (error) {
    console.error("Erreur chargement images Firestore panier", { error })
  }

  return imageMap
}

// --- Mapping ---

function mapToLinePayload(
  line: CartLineRow,
  imageUrl: string | null,
): CartLinePayload {
  const product = line.produit!
  const priceTtc = Number(product.prix_ttc)
  const resolvedImageUrl = imageUrl ?? null

  return {
    id: line.id_ligne_panier,
    productId: line.id_produit,
    name: product.nom,
    slug: product.slug,
    priceTtc,
    quantity: line.quantite,
    stockQuantity: product.quantite_stock,
    isAvailable: product.quantite_stock > 0,
    isStockSufficient: product.quantite_stock >= line.quantite,
    subtotalTtc: Math.round(priceTtc * line.quantite * 100) / 100,
    imageUrl: resolvedImageUrl,
  }
}

function computeCartTotals(lines: CartLinePayload[]) {
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0)

  const totalTtc = lines.reduce((sum, line) => sum + line.subtotalTtc, 0)

  return {
    totalItems,
    totalTtc: Math.round(totalTtc * 100) / 100,
  }
}

// --- Empty response ---

const EMPTY_CART_RESPONSE = {
  cartId: null,
  lines: [],
  totalItems: 0,
  totalTtc: 0,
}

// --- Handler ---

export async function GET() {
  const configValidation = validateRuntimeConfig(CART_API_ENV_KEYS)

  if (!configValidation.isValid) {
    logMissingRuntimeConfig("api.cart.get", configValidation.missingKeys)

    return NextResponse.json(
      createConfigurationMissingApiPayload("Service panier"),
      { status: 503 },
    )
  }

  try {
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    let cartId: string | null = null

    if (user) {
      cartId = await fetchCartByUser(supabaseAdmin, user.id)
    } else {
      const sessionId = await getCartSessionId()

      if (sessionId) {
        cartId = await fetchCartBySession(supabaseAdmin, sessionId)
      }
    }

    if (!cartId) {
      return NextResponse.json(EMPTY_CART_RESPONSE)
    }

    const rawLines = await fetchCartLines(supabaseAdmin, cartId)

    // NOTE: Exclure les lignes dont le produit n'est plus publié
    const validLines = rawLines.filter(
      (line) => line.produit && line.produit.statut === "publie",
    )

    const productIds = validLines.map((line) => line.id_produit)
    const imageMap = await fetchProductImages(productIds)

    const lines = validLines.map((line) =>
      mapToLinePayload(line, imageMap.get(line.id_produit) ?? null),
    )

    const totals = computeCartTotals(lines)

    return NextResponse.json({
      cartId,
      lines,
      ...totals,
    })
  } catch (error) {
    if (isMissingRuntimeConfigError(error)) {
      logMissingRuntimeConfig("api.cart.get", error.missingKeys)

      return NextResponse.json(
        createConfigurationMissingApiPayload("Service panier"),
        { status: 503 },
      )
    }

    console.error("Erreur inattendue lecture panier", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
