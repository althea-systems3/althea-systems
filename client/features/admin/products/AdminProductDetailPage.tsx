"use client"

import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useRouter } from "@/i18n/navigation"

import { deleteAdminProduct, fetchAdminProductById } from "./adminProductsApi"
import {
  formatProductDateDisplay,
  formatProductPriceDisplay,
  getProductAvailabilityClassName,
  getProductAvailabilityLabel,
  mapProductStatusUi,
} from "./adminProductsUtils"
import type { AdminProduct } from "./adminProductsTypes"

type AdminProductDetailPageProps = {
  productId: string
}

function getFallbackImageAltText(productName: string, index: number): string {
  return `${productName} image ${index + 1}`
}

export function AdminProductDetailPage({
  productId,
}: AdminProductDetailPageProps) {
  const router = useRouter()

  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadProduct() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const fetchedProduct = await fetchAdminProductById(productId)

        if (isCancelled) {
          return
        }

        setProduct(fetchedProduct)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger ce produit.",
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProduct()

    return () => {
      isCancelled = true
    }
  }, [productId])

  async function handleDeleteProduct() {
    if (!product) {
      return
    }

    const shouldDelete = window.confirm(
      `Supprimer le produit "${product.nom}" ? Cette action est irréversible.`,
    )

    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await deleteAdminProduct(product.id_produit)
      router.push("/admin/produits")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce produit.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-product-detail-title"
      >
        <h1
          id="admin-product-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Détail produit
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement de la fiche produit...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!product) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-product-detail-title"
      >
        <h1
          id="admin-product-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Détail produit
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            Produit introuvable.
          </CardContent>
        </Card>
      </section>
    )
  }

  const productStatusUi = mapProductStatusUi(product.statut)
  const productAvailabilityLabel = getProductAvailabilityLabel(
    product.quantite_stock,
  )

  return (
    <section className="space-y-6" aria-labelledby="admin-product-detail-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-product-detail-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            {product.nom}
          </h1>
          <p className="text-sm text-slate-600">
            Référence SEO: <span className="font-medium">{product.slug}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/produits">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/admin/produits/${product.id_produit}/edition`}>
              <Pencil className="size-4" aria-hidden="true" />
              Éditer
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="text-brand-error hover:text-brand-error"
            onClick={() => {
              void handleDeleteProduct()
            }}
            disabled={isDeleting}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {isDeleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </header>

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-brand-error/20 bg-red-50 p-4 text-sm text-brand-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations produit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Prix HT
                </p>
                <p className="font-semibold">
                  {formatProductPriceDisplay(product.prix_ht)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  TVA
                </p>
                <p className="font-semibold">{product.tva}%</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Prix TTC
                </p>
                <p className="font-semibold">
                  {formatProductPriceDisplay(product.prix_ttc)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Date de création
                </p>
                <p className="font-semibold">
                  {formatProductDateDisplay(product.date_creation)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Quantité en stock
                </p>
                <p className="font-semibold">{product.quantite_stock}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Disponibilité
                </p>
                <Badge
                  className={getProductAvailabilityClassName(
                    product.quantite_stock,
                  )}
                >
                  {productAvailabilityLabel}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Statut
              </p>
              <Badge className={productStatusUi.className}>
                {productStatusUi.label}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Description
              </p>
              <p className="leading-relaxed text-slate-700">
                {product.description || "Aucune description disponible."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Catégories liées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {product.categories.length > 0 ? (
                product.categories.map((category) => (
                  <Badge
                    key={`${product.id_produit}-${category.id_categorie}`}
                    variant="outline"
                    className="bg-white text-slate-700"
                  >
                    {category.nom}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Aucune catégorie assignée.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Caractéristiques techniques
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.caracteristique_tech &&
          Object.keys(product.caracteristique_tech).length > 0 ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(product.caracteristique_tech).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="rounded-md border border-border p-3"
                  >
                    <dt className="text-xs uppercase tracking-wide text-slate-500">
                      {key}
                    </dt>
                    <dd className="mt-1 text-sm text-slate-700">
                      {String(value)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              Aucune caractéristique technique renseignée.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Images produit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.images && product.images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...product.images]
                .sort((imageA, imageB) => imageA.ordre - imageB.ordre)
                .map((image, index) => (
                  <figure
                    key={image.url}
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <Image
                      src={image.url}
                      alt={
                        image.alt_text ||
                        getFallbackImageAltText(product.nom, index)
                      }
                      width={640}
                      height={400}
                      className="h-40 w-full object-cover"
                    />
                    <figcaption className="space-y-1 px-3 py-2 text-xs text-slate-600">
                      <p>Ordre: {image.ordre + 1}</p>
                      <p>
                        {image.est_principale
                          ? "Image principale"
                          : "Image secondaire"}
                      </p>
                    </figcaption>
                  </figure>
                ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-5 text-center text-sm text-slate-600">
              Aucune image disponible pour ce produit.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
