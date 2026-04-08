import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"

// --- Types ---

type OrderRow = {
  id_commande: string
  numero_commande: string
  id_utilisateur: string
  id_adresse: string
  mode_paiement: string | null
  paiement_dernier_4: string | null
  statut: string
  statut_paiement: string
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  date_commande: string
}

type OrderLineRow = {
  id_produit: string
  quantite: number
  prix_unitaire_ht: number
  prix_total_ttc: number
}

type ProductRow = {
  nom: string
  slug: string
}

type InvoiceRow = {
  numero_facture: string
  statut: string
  pdf_url: string | null
}

type AddressRow = {
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

type FirestoreImageDoc = {
  produit_id: string
  images: { url: string; est_principale: boolean }[]
}

// --- Constantes ---

const FIRESTORE_IMAGES_PRODUITS = "ImagesProduits"
const FIRESTORE_IN_QUERY_LIMIT = 10

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
    console.error("Erreur chargement images confirmation", { error })
  }

  return imageMap
}

// --- Données commande ---

async function fetchOrder(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderNumber: string,
): Promise<OrderRow | null> {
  const { data, error } = await supabaseAdmin
    .from("commande")
    .select(
      "id_commande, numero_commande, id_utilisateur, id_adresse, mode_paiement, paiement_dernier_4, statut, statut_paiement, montant_ht, montant_tva, montant_ttc, date_commande",
    )
    .eq("numero_commande", orderNumber)
    .single()

  if (error || !data) {
    return null
  }

  return data as OrderRow
}

async function fetchOrderLines(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<OrderLineRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ligne_commande")
    .select("id_produit, quantite, prix_unitaire_ht, prix_total_ttc")
    .eq("id_commande", orderId)

  if (error || !data) {
    return []
  }

  return data as OrderLineRow[]
}

async function fetchProductNames(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  productIds: string[],
): Promise<Map<string, ProductRow>> {
  const productMap = new Map<string, ProductRow>()

  if (productIds.length === 0) {
    return productMap
  }

  const { data, error } = await supabaseAdmin
    .from("produit")
    .select("id_produit, nom, slug")
    .in("id_produit", productIds)

  if (error || !data) {
    return productMap
  }

  for (const row of data as (ProductRow & { id_produit: string })[]) {
    productMap.set(row.id_produit, { nom: row.nom, slug: row.slug })
  }

  return productMap
}

async function fetchInvoice(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<InvoiceRow | null> {
  const { data, error } = await supabaseAdmin
    .from("facture")
    .select("numero_facture, statut, pdf_url")
    .eq("id_commande", orderId)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as InvoiceRow
}

async function fetchBillingAddress(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  addressId: string,
): Promise<AddressRow | null> {
  const { data, error } = await supabaseAdmin
    .from("adresse")
    .select(
      "prenom, nom, adresse_1, adresse_2, ville, region, code_postal, pays, telephone",
    )
    .eq("id_adresse", addressId)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as AddressRow
}

// --- Handler ---

type RouteContext = { params: Promise<{ numero: string }> }

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { numero: orderNumber } = await context.params
    const cookieStore = await cookies()
    const supabaseClient = createServerClient(cookieStore)
    const supabaseAdmin = createAdminClient()

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Session expirée", code: "session_expired" },
        { status: 401 },
      )
    }

    const order = await fetchOrder(supabaseAdmin, orderNumber)

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 },
      )
    }

    // NOTE: Vérifier que la commande appartient à l'utilisateur connecté
    if (user.id !== order.id_utilisateur) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const orderLines = await fetchOrderLines(supabaseAdmin, order.id_commande)
    const productIds = orderLines.map((line) => line.id_produit)

    const [productMap, imageMap, invoice, billingAddress] = await Promise.all([
      fetchProductNames(supabaseAdmin, productIds),
      fetchProductImages(productIds),
      fetchInvoice(supabaseAdmin, order.id_commande),
      fetchBillingAddress(supabaseAdmin, order.id_adresse),
    ])

    const lines = orderLines.map((line) => {
      const product = productMap.get(line.id_produit)

      return {
        productId: line.id_produit,
        productName: product?.nom ?? "Produit inconnu",
        productSlug: product?.slug ?? "",
        imageUrl: imageMap.get(line.id_produit) ?? null,
        quantity: line.quantite,
        unitPriceHt: line.prix_unitaire_ht,
        totalTtc: line.prix_total_ttc,
      }
    })

    return NextResponse.json({
      order: {
        orderNumber: order.numero_commande,
        status: order.statut,
        paymentStatus: order.statut_paiement,
        totalHt: order.montant_ht,
        totalTva: order.montant_tva,
        totalTtc: order.montant_ttc,
        createdAt: order.date_commande,
      },
      lines,
      paymentMethod: /^\d{4}$/.test(order.paiement_dernier_4 ?? "")
        ? {
            mode: order.mode_paiement ?? "carte",
            last4: order.paiement_dernier_4!,
          }
        : null,
      billingAddress: billingAddress
        ? {
            firstName: billingAddress.prenom,
            lastName: billingAddress.nom,
            address1: billingAddress.adresse_1,
            address2: billingAddress.adresse_2,
            city: billingAddress.ville,
            region: billingAddress.region,
            postalCode: billingAddress.code_postal,
            country: billingAddress.pays,
            phone: billingAddress.telephone,
          }
        : null,
      invoice: invoice
        ? {
            invoiceNumber: invoice.numero_facture,
            status: invoice.statut,
            pdfUrl: invoice.pdf_url,
          }
        : null,
    })
  } catch (error) {
    console.error("Erreur inattendue confirmation commande", { error })
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
