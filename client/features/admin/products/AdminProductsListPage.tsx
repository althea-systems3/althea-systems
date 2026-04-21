"use client"

import {
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import { type FormEvent, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AdminListErrorAlert,
  AdminListNoticeAlert,
  AdminSortButton,
} from "@/features/admin/shared"
import { Link } from "@/i18n/navigation"

import {
  createDefaultAdminProductFilters,
  deleteAdminProduct,
  fetchAdminProducts,
  fetchAllFilteredProducts,
  runAdminBulkProductsAction,
} from "./adminProductsApi"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"
import {
  ADMIN_PRODUCT_PAGE_SIZE_OPTIONS,
  ADMIN_PRODUCT_SORT_LABELS,
  buildProductsCsvContent,
  buildProductsExcelXmlContent,
  formatProductDateDisplay,
  formatProductPriceDisplay,
  getProductAvailabilityClassName,
  getProductAvailabilityLabel,
  mapProductStatusUi,
  triggerFileDownload,
} from "./adminProductsUtils"
import type {
  AdminProduct,
  AdminProductListFilters,
  AdminProductSortBy,
} from "./adminProductsTypes"

type ExportFormat = "csv" | "excel"
type ExportScope = "selection" | "filtered"

function toggleProductSelection(
  selectedProductIds: string[],
  productId: string,
): string[] {
  if (selectedProductIds.includes(productId)) {
    return selectedProductIds.filter((selectedId) => selectedId !== productId)
  }

  return [...selectedProductIds, productId]
}

function buildExportFileName(scope: ExportScope, format: ExportFormat): string {
  const dateSuffix = new Date().toISOString().slice(0, 10)
  const exportScopeLabel = scope === "selection" ? "selection" : "filtres"
  const extension = format === "csv" ? "csv" : "xls"

  return `admin-produits-${exportScopeLabel}-${dateSuffix}.${extension}`
}

export function AdminProductsListPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<
    Array<{ id_categorie: string; nom: string }>
  >([])
  const [filters, setFilters] = useState<AdminProductListFilters>(
    createDefaultAdminProductFilters,
  )
  const [searchDraft, setSearchDraft] = useState("")
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  const [paginationMeta, setPaginationMeta] = useState({
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  )
  const [bulkCategoryId, setBulkCategoryId] = useState("")

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const selectedCount = selectedProductIds.length

  const isAllCurrentPageSelected = useMemo(() => {
    if (products.length === 0) {
      return false
    }

    return products.every((product) =>
      selectedProductIds.includes(product.id_produit),
    )
  }, [products, selectedProductIds])

  useEffect(() => {
    let isCancelled = false

    async function loadProducts() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const payload = await fetchAdminProducts(filters)

        if (isCancelled) {
          return
        }

        setProducts(payload.products)
        setCategories(payload.categories)
        setPaginationMeta(payload.pagination)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger la liste des produits.",
        )
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadProducts()

    return () => {
      isCancelled = true
    }
  }, [filters])

  function handleSort(column: AdminProductSortBy) {
    setFilters((previousFilters) => {
      const nextSortDirection =
        previousFilters.sortBy === column &&
        previousFilters.sortDirection === "asc"
          ? "desc"
          : "asc"

      return {
        ...previousFilters,
        sortBy: column,
        sortDirection: nextSortDirection,
        page: 1,
      }
    })
  }

  function handlePageSizeChange(nextPageSize: number) {
    setFilters((previousFilters) => ({
      ...previousFilters,
      pageSize: nextPageSize,
      page: 1,
    }))
  }

  function handleApplySearch(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()

    setFilters((previousFilters) => ({
      ...previousFilters,
      search: searchDraft,
      page: 1,
    }))
  }

  function handleResetFilters() {
    const defaultFilters = createDefaultAdminProductFilters()

    setSearchDraft("")
    setFilters(defaultFilters)
    setBulkCategoryId("")
  }

  function handleToggleCurrentPageSelection() {
    setSelectedProductIds((previousSelectedProductIds) => {
      if (isAllCurrentPageSelected) {
        return previousSelectedProductIds.filter(
          (selectedProductId) =>
            !products.some(
              (product) => product.id_produit === selectedProductId,
            ),
        )
      }

      const nextSelectedProductIds = new Set(previousSelectedProductIds)
      products.forEach((product) => {
        nextSelectedProductIds.add(product.id_produit)
      })

      return Array.from(nextSelectedProductIds)
    })
  }

  async function handleDeleteProduct(product: AdminProduct) {
    const shouldDelete = await confirmCriticalAction({
      title: "Supprimer le produit",
      message: `Supprimer le produit "${product.nom}" ? Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!shouldDelete) {
      return
    }

    setDeletingProductId(product.id_produit)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await deleteAdminProduct(product.id_produit)

      setNoticeMessage("Produit supprimé avec succès.")
      setFilters((previousFilters) => ({
        ...previousFilters,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce produit.",
      )
    } finally {
      setDeletingProductId(null)
    }
  }

  async function handleBulkAction(action: "delete" | "publish" | "unpublish") {
    if (selectedProductIds.length === 0) {
      return
    }

    if (action === "delete") {
      const shouldDelete = await confirmCriticalAction({
        title: "Supprimer les produits",
        message:
          "Supprimer tous les produits sélectionnés ? Cette action est irréversible.",
        confirmLabel: "Supprimer",
        tone: "danger",
      })

      if (!shouldDelete) {
        return
      }
    }

    setIsBulkActionLoading(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const payload = await runAdminBulkProductsAction({
        action,
        productIds: selectedProductIds,
      })

      setNoticeMessage(
        `${payload.affectedCount} produit(s) mis à jour via l'action groupée.`,
      )
      setSelectedProductIds([])
      setFilters((previousFilters) => ({
        ...previousFilters,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'appliquer l'action groupée.",
      )
    } finally {
      setIsBulkActionLoading(false)
    }
  }

  async function handleBulkCategoryUpdate() {
    if (selectedProductIds.length === 0 || !bulkCategoryId) {
      return
    }

    setIsBulkActionLoading(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const payload = await runAdminBulkProductsAction({
        action: "set_category",
        productIds: selectedProductIds,
        categoryId: bulkCategoryId,
      })

      setNoticeMessage(
        `${payload.affectedCount} produit(s) déplacé(s) dans la catégorie sélectionnée.`,
      )
      setSelectedProductIds([])
      setFilters((previousFilters) => ({
        ...previousFilters,
      }))
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier la catégorie en masse.",
      )
    } finally {
      setIsBulkActionLoading(false)
    }
  }

  async function handleExport(scope: ExportScope, format: ExportFormat) {
    if (scope === "selection" && selectedProductIds.length === 0) {
      return
    }

    setIsExporting(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const allFilteredProducts = await fetchAllFilteredProducts({
        ...filters,
        page: 1,
      })

      const productsToExport =
        scope === "selection"
          ? allFilteredProducts.filter((product) =>
              selectedProductIds.includes(product.id_produit),
            )
          : allFilteredProducts

      if (productsToExport.length === 0) {
        setNoticeMessage("Aucun produit à exporter pour ce périmètre.")
        return
      }

      const fileName = buildExportFileName(scope, format)

      if (format === "csv") {
        triggerFileDownload(
          buildProductsCsvContent(productsToExport),
          fileName,
          "text/csv;charset=utf-8",
        )
      } else {
        triggerFileDownload(
          buildProductsExcelXmlContent(productsToExport),
          fileName,
          "application/vnd.ms-excel;charset=utf-8",
        )
      }

      setNoticeMessage(`${productsToExport.length} produit(s) exporté(s).`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'exporter les produits.",
      )
    } finally {
      setIsExporting(false)
    }
  }

  const currentSortLabel = ADMIN_PRODUCT_SORT_LABELS[filters.sortBy] ?? "Nom"

  return (
    <section className="space-y-6" aria-labelledby="admin-products-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-products-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Gestion des produits
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Tableau complet avec tri, filtres, actions rapides et actions
            groupées.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/admin/produits/nouveau">
              <Plus className="size-4" aria-hidden="true" />
              Nouveau produit
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void handleExport("filtered", "csv")
            }}
            disabled={isExporting}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV filtres
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void handleExport("filtered", "excel")
            }}
            disabled={isExporting}
          >
            <Download className="size-4" aria-hidden="true" />
            Export Excel filtres
          </Button>
        </div>
      </header>

      <AdminListErrorAlert message={errorMessage} />
      <AdminListNoticeAlert message={noticeMessage} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Recherche et filtres
          </CardTitle>
          <CardDescription>
            Tri actuel: {currentSortLabel} ({filters.sortDirection}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid gap-3 lg:grid-cols-[2fr_auto]"
            onSubmit={handleApplySearch}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche globale</span>
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => {
                  setSearchDraft(event.target.value)
                }}
                placeholder="Nom, slug ou description"
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <div className="flex items-end gap-2">
              <Button type="submit">
                <Filter className="size-4" aria-hidden="true" />
                Rechercher
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
              >
                Réinit.
              </Button>
            </div>
          </form>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut</span>
              <select
                value={filters.status}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    status: event.target
                      .value as AdminProductListFilters["status"],
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="publie">Publié</option>
                <option value="brouillon">Brouillon</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Catégorie</span>
              <select
                value={filters.categoryId}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    categoryId: event.target.value,
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="">Toutes</option>
                {categories.map((category) => (
                  <option
                    key={category.id_categorie}
                    value={category.id_categorie}
                  >
                    {category.nom}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Disponibilité</span>
              <select
                value={filters.availability}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    availability: event.target
                      .value as AdminProductListFilters["availability"],
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Toutes</option>
                <option value="in_stock">En stock</option>
                <option value="out_of_stock">Rupture</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Taille de page</span>
              <select
                value={String(filters.pageSize)}
                onChange={(event) => {
                  handlePageSizeChange(Number.parseInt(event.target.value, 10))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                {ADMIN_PRODUCT_PAGE_SIZE_OPTIONS.map((pageSizeOption) => (
                  <option key={pageSizeOption} value={pageSizeOption}>
                    {pageSizeOption}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Date de création - début</span>
              <input
                type="date"
                value={filters.createdFrom}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    createdFrom: event.target.value,
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Date de création - fin</span>
              <input
                type="date"
                value={filters.createdTo}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    createdTo: event.target.value,
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Prix min TTC</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.priceMin}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    priceMin: event.target.value,
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Prix max TTC</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filters.priceMax}
                onChange={(event) => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    priceMax: event.target.value,
                    page: 1,
                  }))
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {selectedCount > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Badge className="bg-brand-cta text-white">
              {selectedCount} sélectionné(s)
            </Badge>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleBulkAction("publish")
              }}
              disabled={isBulkActionLoading}
            >
              Publier sélection
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleBulkAction("unpublish")
              }}
              disabled={isBulkActionLoading}
            >
              Dépublier sélection
            </Button>

            <div className="flex items-center gap-2">
              <select
                value={bulkCategoryId}
                onChange={(event) => {
                  setBulkCategoryId(event.target.value)
                }}
                className="h-9 rounded-md border border-border px-2 text-sm"
              >
                <option value="">Choisir catégorie</option>
                {categories.map((category) => (
                  <option
                    key={category.id_categorie}
                    value={category.id_categorie}
                  >
                    {category.nom}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleBulkCategoryUpdate()
                }}
                disabled={isBulkActionLoading || !bulkCategoryId}
              >
                Modifier catégorie
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleExport("selection", "csv")
              }}
              disabled={isExporting}
            >
              Export sélection CSV
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleExport("selection", "excel")
              }}
              disabled={isExporting}
            >
              Export sélection Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              className="text-brand-error hover:text-brand-error"
              onClick={() => {
                void handleBulkAction("delete")
              }}
              disabled={isBulkActionLoading}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Supprimer sélection
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Tableau produits
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement en cours..."
              : `${paginationMeta.totalItems} produit(s) trouvé(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={isAllCurrentPageSelected}
                      onChange={handleToggleCurrentPageSelection}
                    />
                  </th>
                  <th className="px-2 py-3">Miniature</th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="nom"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Nom
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">Description</th>
                  <th className="px-2 py-3">Catégorie(s)</th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="prix_ht"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Prix HT
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">TVA</th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="prix_ttc"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Prix TTC
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">Stock</th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="statut"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Statut
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="date_creation"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Date création
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="quantite_stock"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Qté stock
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">Actions rapides</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-2 py-8 text-center text-sm text-slate-500"
                    >
                      Aucun produit ne correspond aux filtres actuels.
                    </td>
                  </tr>
                ) : null}

                {products.map((product) => {
                  const productStatusUi = mapProductStatusUi(product.statut)

                  return (
                    <tr
                      key={product.id_produit}
                      className="border-b border-border/60 align-top"
                    >
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${product.nom}`}
                          checked={selectedProductIds.includes(
                            product.id_produit,
                          )}
                          onChange={() => {
                            setSelectedProductIds(
                              (previousSelectedProductIds) => {
                                return toggleProductSelection(
                                  previousSelectedProductIds,
                                  product.id_produit,
                                )
                              },
                            )
                          }}
                        />
                      </td>

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
                        <p className="mt-1 text-xs text-slate-500">
                          {product.slug}
                        </p>
                      </td>

                      <td className="px-2 py-3">
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {product.description || "-"}
                        </p>
                      </td>

                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-1">
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
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      </td>

                      <td className="px-2 py-3 text-xs text-slate-700">
                        {formatProductPriceDisplay(product.prix_ht)}
                      </td>

                      <td className="px-2 py-3 text-xs text-slate-700">
                        {product.tva}%
                      </td>

                      <td className="px-2 py-3 text-xs text-slate-700">
                        {formatProductPriceDisplay(product.prix_ttc)}
                      </td>

                      <td className="px-2 py-3">
                        <Badge
                          className={getProductAvailabilityClassName(
                            product.quantite_stock,
                          )}
                        >
                          {getProductAvailabilityLabel(product.quantite_stock)}
                        </Badge>
                      </td>

                      <td className="px-2 py-3">
                        <Badge className={productStatusUi.className}>
                          {productStatusUi.label}
                        </Badge>
                      </td>

                      <td className="px-2 py-3 text-xs text-slate-700">
                        {formatProductDateDisplay(product.date_creation)}
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
                              <Eye className="size-3.5" aria-hidden="true" />
                              Voir
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
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Éditer
                            </Link>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-brand-error hover:text-brand-error"
                            onClick={() => {
                              void handleDeleteProduct(product)
                            }}
                            disabled={deletingProductId === product.id_produit}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            {deletingProductId === product.id_produit
                              ? "Suppression..."
                              : "Supprimer"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-slate-600">
              Page {paginationMeta.page} /{" "}
              {Math.max(paginationMeta.totalPages, 1)}
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={paginationMeta.page <= 1}
                onClick={() => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    page: Math.max(1, paginationMeta.page - 1),
                  }))
                }}
              >
                Précédent
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  paginationMeta.totalPages === 0 ||
                  filters.page >= paginationMeta.totalPages
                }
                onClick={() => {
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    page:
                      paginationMeta.totalPages === 0
                        ? paginationMeta.page
                        : Math.min(
                            paginationMeta.totalPages,
                            paginationMeta.page + 1,
                          ),
                  }))
                }}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
