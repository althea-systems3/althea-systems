import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateCartSessionId } from "@/lib/auth/cartSession"
import { MAX_QUANTITY_PER_LINE } from "@/lib/products/constants"
import {
  CART_API_ENV_KEYS,
  ensureRuntimeConfig,
  handleMissingRuntimeConfigError,
} from "@/lib/config/runtime"
import type { Produit, Panier, LignePanier } from "@/lib/supabase/types"

const MIN_QUANTITY = 1

type AddToCartPayload = {
  id_produit: string
  quantite: number
}

function validatePayload(
  body: unknown,
):
  | { valid: true; payload: AddToCartPayload }
  | { valid: false; message: string } {
  const parsed = body as Record<string, unknown>

  if (!parsed?.id_produit || typeof parsed.id_produit !== "string") {
    return { valid: false, message: "id_produit est requis" }
  }

  const quantite = Number(parsed.quantite)

  if (!Number.isInteger(quantite) || quantite < MIN_QUANTITY) {
    return { valid: false, message: "quantite doit être un entier >= 1" }
  }

  if (quantite > MAX_QUANTITY_PER_LINE) {
    return {
      valid: false,
      message: `quantite ne peut pas dépasser ${MAX_QUANTITY_PER_LINE}`,
    }
  }

  return {
    valid: true,
    payload: { id_produit: parsed.id_produit as string, quantite },
  }
}

async function fetchPublishedProduct(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  productId: string,
): Promise<Produit | null> {
  const { data, error } = await supabaseAdmin
    .from("produit")
    .select("id_produit, nom, slug, quantite_stock, statut, prix_ttc")
    .eq("id_produit", productId)
    .eq("statut", "publie")
    .single()

  if (error || !data) {
    return null
  }

  return data as Produit
}

async function fetchOrCreateCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string | null,
  sessionId: string,
): Promise<string> {
  const lookupField = userId ? "id_utilisateur" : "session_id"
  const lookupValue = userId ?? sessionId

  const { data: existingCart } = await supabaseAdmin
    .from("panier")
    .select("id_panier")
    .eq(lookupField, lookupValue)
    .limit(1)
    .single()

  if (existingCart) {
    return (existingCart as Panier).id_panier
  }

  const insertPayload = userId
    ? { id_utilisateur: userId }
    : { session_id: sessionId }

  const { data: newCart, error: insertError } = await supabaseAdmin
    .from("panier")
    .insert(insertPayload as never)
    .select("id_panier")
    .single()

  if (insertError || !newCart) {
    throw new Error("Impossible de créer le panier")
  }

  return (newCart as Panier).id_panier
}

async function fetchExistingCartLine(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
  productId: string,
): Promise<LignePanier | null> {
  const { data } = await supabaseAdmin
    .from("ligne_panier")
    .select("id_ligne_panier, id_panier, id_produit, quantite")
    .eq("id_panier", cartId)
    .eq("id_produit", productId)
    .limit(1)
    .single()

  if (!data) {
    return null
  }

  return data as LignePanier
}

async function updateCartLineQuantity(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  lineId: string,
  newQuantity: number,
): Promise<LignePanier> {
  const { data, error } = await supabaseAdmin
    .from("ligne_panier")
    .update({ quantite: newQuantity } as never)
    .eq("id_ligne_panier", lineId)
    .select("id_ligne_panier, id_panier, id_produit, quantite")
    .single()

  if (error || !data) {
    throw new Error("Impossible de mettre à jour la ligne panier")
  }

  return data as LignePanier
}

async function createCartLine(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
  productId: string,
  quantity: number,
): Promise<LignePanier> {
  const { data, error } = await supabaseAdmin
    .from("ligne_panier")
    .insert({
      id_panier: cartId,
      id_produit: productId,
      quantite: quantity,
    } as never)
    .select("id_ligne_panier, id_panier, id_produit, quantite")
    .single()

  if (error || !data) {
    throw new Error("Impossible de créer la ligne panier")
  }

  return data as LignePanier
}

export async function POST(request: Request) {
  const configError = ensureRuntimeConfig(
    "api.cart.items.post",
    "Service panier",
    CART_API_ENV_KEYS,
  )
  if (configError) return configError

  try {
    const body = await request.json()
    const validation = validatePayload(body)

    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    const { id_produit, quantite } = validation.payload
    const supabaseAdmin = createAdminClient()

    const product = await fetchPublishedProduct(supabaseAdmin, id_produit)

    if (!product) {
      return NextResponse.json(
        { error: "Produit inexistant ou non publié" },
        { status: 404 },
      )
    }

    if (product.quantite_stock <= 0) {
      return NextResponse.json(
        { error: "Produit en rupture de stock" },
        { status: 400 },
      )
    }

    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    const { sessionId } = await getOrCreateCartSessionId()
    const cartId = await fetchOrCreateCart(
      supabaseAdmin,
      user?.id ?? null,
      sessionId,
    )

    const existingLine = await fetchExistingCartLine(
      supabaseAdmin,
      cartId,
      id_produit,
    )

    if (existingLine) {
      const newQuantity = existingLine.quantite + quantite

      if (newQuantity > product.quantite_stock) {
        return NextResponse.json(
          {
            error: "Stock insuffisant",
            availableStock: product.quantite_stock,
            currentCartQuantity: existingLine.quantite,
          },
          { status: 400 },
        )
      }

      if (newQuantity > MAX_QUANTITY_PER_LINE) {
        return NextResponse.json(
          { error: `Quantité maximale par ligne : ${MAX_QUANTITY_PER_LINE}` },
          { status: 400 },
        )
      }

      const updatedLine = await updateCartLineQuantity(
        supabaseAdmin,
        existingLine.id_ligne_panier,
        newQuantity,
      )

      return NextResponse.json({
        cartLine: updatedLine,
        isNewLine: false,
      })
    }

    if (quantite > product.quantite_stock) {
      return NextResponse.json(
        {
          error: "Stock insuffisant",
          availableStock: product.quantite_stock,
        },
        { status: 400 },
      )
    }

    const newLine = await createCartLine(
      supabaseAdmin,
      cartId,
      id_produit,
      quantite,
    )

    return NextResponse.json(
      { cartLine: newLine, isNewLine: true },
      { status: 201 },
    )
  } catch (error) {
    const configError = handleMissingRuntimeConfigError(
      error,
      "api.cart.items.post",
      "Service panier",
    )
    if (configError) return configError

    console.error("Erreur inattendue ajout au panier", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
