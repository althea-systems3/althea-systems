"use client"

import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useRouter } from "@/i18n/navigation"
import {
  mapProductStatusClassName,
  mapProductStatusLabel,
} from "@/features/admin/adminUtils"

import {
  deleteAdminCategory,
  fetchAdminCategoryById,
} from "./adminCategoriesApi"
import type {
  AdminCategory,
  AdminCategoryAssociatedProduct,
} from "./adminCategoriesTypes"
import {
  getCategoryImageAlt,
  mapCategoryStatusUi,
} from "./adminCategoriesUtils"

type AdminCategoryDetailPageProps = {
  categoryId: string
}

export function AdminCategoryDetailPage({
  categoryId,
}: AdminCategoryDetailPageProps) {
  const router = useRouter()

  const [category, setCategory] = useState<AdminCategory | null>(null)
  const [associatedProducts, setAssociatedProducts] = useState<
    AdminCategoryAssociatedProduct[]
  >([])

  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadDetail() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const payload = await fetchAdminCategoryById(categoryId)

        if (isCancelled) {
          return
        }

        setCategory(payload.category)
        setAssociatedProducts(payload.products)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger la catégorie.",
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      isCancelled = true
    }
  }, [categoryId])

  async function handleDeleteCategory() {
    if (!category) {
      return
    }

    const shouldDelete = window.confirm(
      `Supprimer la catégorie "${category.nom}" ? Cette action est irréversible.`,
    )

    if (!shouldDelete) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      await deleteAdminCategory(category.id_categorie)
      router.push("/admin/categories")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette catégorie.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-category-detail-title"
      >
        <h1
          id="admin-category-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Détail catégorie
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement de la fiche catégorie...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!category) {
    return (
      <section
        className="space-y-4"
        aria-labelledby="admin-category-detail-title"
      >
        <h1
          id="admin-category-detail-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Détail catégorie
        </h1>

        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            Catégorie introuvable.
          </CardContent>
        </Card>
      </section>
    )
  }

  const statusUi = mapCategoryStatusUi(category.statut)

  return (
    <section
      className="space-y-6"
      aria-labelledby="admin-category-detail-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-category-detail-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            {category.nom}
          </h1>
          <p className="text-sm text-slate-600">
            Slug: <span className="font-medium">/{category.slug}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/categories">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour liste
            </Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={`/admin/categories/${category.id_categorie}/edition`}>
              <Pencil className="size-4" aria-hidden="true" />
              Éditer catégorie
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="text-brand-error hover:text-brand-error"
            onClick={() => {
              void handleDeleteCategory()
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Informations catégorie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700">
            <div className="overflow-hidden rounded-lg border border-border">
              {category.image_url ? (
                <Image
                  src={category.image_url}
                  alt={getCategoryImageAlt(category.nom)}
                  width={640}
                  height={360}
                  className="h-52 w-full object-cover"
                />
              ) : (
                <div className="flex h-52 items-center justify-center bg-slate-50 text-sm text-slate-500">
                  Aucune image catégorie
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Ordre d&apos;affichage
                </p>
                <p className="font-semibold">{category.ordre_affiche}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Nombre de produits
                </p>
                <p className="font-semibold">{category.nombre_produits}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Statut
              </p>
              <Badge className={statusUi.className}>{statusUi.label}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Description
              </p>
              <p className="leading-relaxed">
                {category.description || "Aucune description disponible."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Produits associés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {associatedProducts.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-600">
                Aucun produit n&apos;est actuellement rattaché à cette
                catégorie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-3">Miniature</th>
                      <th className="px-2 py-3">Nom produit</th>
                      <th className="px-2 py-3">Statut</th>
                      <th className="px-2 py-3">Stock</th>
                      <th className="px-2 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {associatedProducts.map((product) => (
                      <tr
                        key={`${category.id_categorie}-${product.id_produit}`}
                        className="border-b border-border/60"
                      >
                        <td className="px-2 py-3">
                          {product.image_principale_url ? (
                            <Image
                              src={product.image_principale_url}
                              alt={product.nom}
                              width={56}
                              height={56}
                              className="h-14 w-14 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border bg-slate-50 text-[10px] text-slate-500">
                              Aucune image
                            </div>
                          )}
                        </td>

                        <td className="px-2 py-3">
                          <p className="font-medium text-brand-nav">
                            {product.nom}
                          </p>
                          <p className="text-xs text-slate-500">
                            {product.slug}
                          </p>
                        </td>

                        <td className="px-2 py-3">
                          <Badge
                            className={mapProductStatusClassName(
                              product.statut,
                            )}
                          >
                            {mapProductStatusLabel(product.statut)}
                          </Badge>
                        </td>

                        <td className="px-2 py-3 text-xs text-slate-700">
                          {product.quantite_stock}
                        </td>

                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              asChild
                              type="button"
                              size="sm"
                              variant="outline"
                            >
                              <Link
                                href={`/admin/produits/${product.id_produit}`}
                              >
                                Voir produit
                              </Link>
                            </Button>

                            <Button
                              asChild
                              type="button"
                              size="sm"
                              variant="outline"
                            >
                              <Link
                                href={`/admin/produits/${product.id_produit}/edition`}
                              >
                                Éditer produit
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
