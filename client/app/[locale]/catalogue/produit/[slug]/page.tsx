import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_IMAGES_PRODUITS } from "@/lib/top-produits/constants"
import type { Produit } from "@/lib/supabase/types"

type ProductPageProps = {
  params: Promise<{ locale: string; slug: string }>
}

type ProductPageData = {
  id: string
  name: string
  description: string | null
  price: number | null
  isAvailable: boolean
  imageUrl: string | null
  imageAlt: string | null
}

type FirestoreProductImage = {
  url: string
  ordre: number
  est_principale: boolean
  alt_text?: string
}

type FirestoreImageDoc = {
  produit_id: string
  images: FirestoreProductImage[]
}

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  )
}

function formatProductPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price)
}

async function fetchMainProductImage(productId: string): Promise<{
  url: string | null
  altText: string | null
}> {
  try {
    const firestore = getFirestoreClient()

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_PRODUITS)
      .where("produit_id", "==", productId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return { url: null, altText: null }
    }

    const imageDoc = snapshot.docs[0].data() as FirestoreImageDoc
    const images = imageDoc.images ?? []

    if (images.length === 0) {
      return { url: null, altText: null }
    }

    const sortedImages = [...images].sort((a, b) => a.ordre - b.ordre)
    const mainImage =
      sortedImages.find((image) => image.est_principale) ?? sortedImages[0]

    return {
      url: mainImage?.url ?? null,
      altText: mainImage?.alt_text ?? null,
    }
  } catch (error) {
    console.error("Failed to load product image", {
      productId,
      error,
    })
    return { url: null, altText: null }
  }
}

async function fetchProductBySlug(
  slug: string,
): Promise<ProductPageData | null> {
  if (!hasRequiredConfig()) {
    return null
  }

  const supabaseAdmin = createAdminClient()
  const { data: rawProduct, error } = await supabaseAdmin
    .from("produit")
    .select("id_produit, nom, description, prix_ttc, quantite_stock, statut")
    .eq("slug", slug)
    .eq("statut", "publie")
    .single()

  if (error || !rawProduct) {
    return null
  }

  const product = rawProduct as Pick<
    Produit,
    "id_produit" | "nom" | "description" | "prix_ttc" | "quantite_stock"
  >
  const image = await fetchMainProductImage(product.id_produit)

  return {
    id: product.id_produit,
    name: product.nom,
    description: product.description,
    price: product.prix_ttc,
    isAvailable: product.quantite_stock > 0,
    imageUrl: image.url,
    imageAlt: image.altText,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params
  const t = await getTranslations("CataloguePage")
  const product = await fetchProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const hasPrice = typeof product.price === "number"

  return (
    <section className="container py-8 pb-14 sm:py-10 sm:pb-20">
      <article className="mx-auto max-w-5xl space-y-6">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={
                product.imageAlt ??
                t("products.productImageAlt", { productName: product.name })
              }
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-nav/90 to-brand-cta/80"
              aria-hidden="true"
            >
              <span className="heading-font px-4 text-center text-xl text-white sm:text-2xl">
                {t("products.missingImageLabel")}
              </span>
            </div>
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent"
            aria-hidden="true"
          />
        </div>

        <header className="space-y-3">
          <h1 className="heading-font text-2xl leading-tight text-brand-nav sm:text-3xl md:text-4xl">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-base font-semibold text-brand-nav sm:text-lg">
              {hasPrice
                ? formatProductPrice(product.price as number, locale)
                : t("products.priceUnavailable")}
            </p>

            <span
              className={
                product.isAvailable
                  ? "inline-flex rounded-full bg-brand-success/15 px-2.5 py-1 text-xs font-semibold text-brand-success"
                  : "inline-flex rounded-full bg-brand-error/15 px-2.5 py-1 text-xs font-semibold text-brand-error"
              }
            >
              {product.isAvailable
                ? t("products.availabilityAvailable")
                : t("products.availabilityOutOfStock")}
            </span>
          </div>
        </header>

        {product.description ? (
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
            {product.description}
          </p>
        ) : null}
      </article>
    </section>
  )
}
