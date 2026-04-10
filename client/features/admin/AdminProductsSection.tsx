"use client"

import { AlertCircle, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react"
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminFetch, parseApiResponse } from "@/features/admin/adminApi"
import {
  formatCurrency,
  mapProductStatusClassName,
  mapProductStatusLabel,
} from "@/features/admin/adminUtils"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"
import { cn } from "@/lib/utils"

type ProductStatus = "publie" | "brouillon"
type ProductFilterStatus = "all" | ProductStatus

type AdminCategory = {
  id_categorie: string
  nom: string
}

type AdminProduct = {
  id_produit: string
  nom: string
  description: string | null
  prix_ttc: number
  quantite_stock: number
  statut: ProductStatus
  slug: string
  categories: AdminCategory[]
}

type ProductsPayload = {
  products: AdminProduct[]
  categories: AdminCategory[]
}

type ProductFormState = {
  nom: string
  description: string
  prix_ttc: string
  quantite_stock: string
  statut: ProductStatus
  slug: string
  categoryIds: string[]
}

type ProductFilters = {
  search: string
  status: ProductFilterStatus
  categoryId: string
}

const INITIAL_PRODUCT_FORM: ProductFormState = {
  nom: "",
  description: "",
  prix_ttc: "",
  quantite_stock: "",
  statut: "brouillon",
  slug: "",
  categoryIds: [],
}

const INITIAL_FILTERS: ProductFilters = {
  search: "",
  status: "all",
  categoryId: "",
}

function mapProductToForm(product: AdminProduct): ProductFormState {
  return {
    nom: product.nom,
    description: product.description ?? "",
    prix_ttc: String(product.prix_ttc),
    quantite_stock: String(product.quantite_stock),
    statut: product.statut,
    slug: product.slug,
    categoryIds: product.categories.map((category) => category.id_categorie),
  }
}

function parseNumericValue(value: string): number | null {
  const parsedValue = Number.parseFloat(value)

  if (!Number.isFinite(parsedValue)) {
    return null
  }

  return parsedValue
}

function getQueryString(filters: ProductFilters): string {
  const searchParams = new URLSearchParams()

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  if (filters.categoryId) {
    searchParams.set("categoryId", filters.categoryId)
  }

  return searchParams.toString()
}

function toggleCategorySelection(
  currentValue: string[],
  categoryId: string,
): string[] {
  if (currentValue.includes(categoryId)) {
    return currentValue.filter((id) => id !== categoryId)
  }

  return [...currentValue, categoryId]
}

export function AdminProductsSection() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [filters, setFilters] = useState<ProductFilters>(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState("")
  const [statusInput, setStatusInput] = useState<ProductFilterStatus>("all")
  const [categoryInput, setCategoryInput] = useState("")

  const [createForm, setCreateForm] =
    useState<ProductFormState>(INITIAL_PRODUCT_FORM)
  const [isCreating, setIsCreating] = useState(false)

  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editForm, setEditForm] =
    useState<ProductFormState>(INITIAL_PRODUCT_FORM)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  )

  const productsCount = products.length

  const selectedProduct = useMemo(() => {
    if (!editingProductId) {
      return null
    }

    return (
      products.find((product) => product.id_produit === editingProductId) ??
      null
    )
  }, [editingProductId, products])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const queryString = getQueryString(filters)
      const endpoint = queryString
        ? `/api/admin/produits?${queryString}`
        : "/api/admin/produits"

      const response = await adminFetch(endpoint, { cache: "no-store" })

      const payload = await parseApiResponse<ProductsPayload>(
        response,
        "Impossible de charger les produits.",
      )

      setProducts(payload.products)
      setCategories(payload.categories)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les produits.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const handleApplyFilters = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    setNoticeMessage(null)
    setFilters({
      search: searchInput,
      status: statusInput,
      categoryId: categoryInput,
    })
  }

  const handleResetFilters = () => {
    setSearchInput("")
    setStatusInput("all")
    setCategoryInput("")
    setFilters(INITIAL_FILTERS)
  }

  const handleCreateProduct = async (
    submitEvent: FormEvent<HTMLFormElement>,
  ) => {
    submitEvent.preventDefault()
    setErrorMessage(null)
    setNoticeMessage(null)

    const price = parseNumericValue(createForm.prix_ttc)
    const stockQuantity = parseNumericValue(createForm.quantite_stock)

    if (!createForm.nom.trim()) {
      setErrorMessage("Le nom du produit est obligatoire.")
      return
    }

    if (price === null || price < 0) {
      setErrorMessage("Le prix TTC doit etre un nombre positif.")
      return
    }

    if (stockQuantity === null || stockQuantity < 0) {
      setErrorMessage("Le stock doit etre un nombre positif.")
      return
    }

    setIsCreating(true)

    try {
      const response = await adminFetch("/api/admin/produits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nom: createForm.nom,
          description: createForm.description,
          prix_ttc: price,
          quantite_stock: Math.round(stockQuantity),
          statut: createForm.statut,
          slug: createForm.slug,
          categoryIds: createForm.categoryIds,
        }),
      })

      await parseApiResponse<{ product: AdminProduct }>(
        response,
        "Impossible de creer le produit.",
      )

      setNoticeMessage("Produit cree avec succes.")
      setCreateForm(INITIAL_PRODUCT_FORM)
      await loadProducts()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de creer le produit.",
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (product: AdminProduct) => {
    setEditingProductId(product.id_produit)
    setEditForm(mapProductToForm(product))
    setErrorMessage(null)
    setNoticeMessage(null)
  }

  const handleCancelEdit = () => {
    setEditingProductId(null)
    setEditForm(INITIAL_PRODUCT_FORM)
  }

  const handleUpdateProduct = async (
    submitEvent: FormEvent<HTMLFormElement>,
  ) => {
    submitEvent.preventDefault()

    if (!editingProductId) {
      return
    }

    setErrorMessage(null)
    setNoticeMessage(null)

    const price = parseNumericValue(editForm.prix_ttc)
    const stockQuantity = parseNumericValue(editForm.quantite_stock)

    if (!editForm.nom.trim()) {
      setErrorMessage("Le nom du produit est obligatoire.")
      return
    }

    if (price === null || price < 0) {
      setErrorMessage("Le prix TTC doit etre un nombre positif.")
      return
    }

    if (stockQuantity === null || stockQuantity < 0) {
      setErrorMessage("Le stock doit etre un nombre positif.")
      return
    }

    setIsUpdating(true)

    try {
      const response = await adminFetch(
        `/api/admin/produits/${editingProductId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nom: editForm.nom,
            description: editForm.description,
            prix_ttc: price,
            quantite_stock: Math.round(stockQuantity),
            statut: editForm.statut,
            slug: editForm.slug,
            categoryIds: editForm.categoryIds,
          }),
        },
      )

      await parseApiResponse<{ product: AdminProduct }>(
        response,
        "Impossible de mettre a jour le produit.",
      )

      setNoticeMessage("Produit mis a jour avec succes.")
      setEditingProductId(null)
      await loadProducts()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour le produit.",
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteProduct = async (product: AdminProduct) => {
    const shouldDelete = await confirmCriticalAction({
      title: "Supprimer le produit",
      message: `Supprimer le produit \"${product.nom}\" ? Cette action est irreversible.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!shouldDelete) {
      return
    }

    setErrorMessage(null)
    setNoticeMessage(null)
    setDeletingProductId(product.id_produit)

    try {
      const response = await adminFetch(
        `/api/admin/produits/${product.id_produit}`,
        {
          method: "DELETE",
        },
      )

      await parseApiResponse<{ success: boolean }>(
        response,
        "Impossible de supprimer le produit.",
      )

      setNoticeMessage("Produit supprime avec succes.")

      if (editingProductId === product.id_produit) {
        handleCancelEdit()
      }

      await loadProducts()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le produit.",
      )
    } finally {
      setDeletingProductId(null)
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-products-title">
      <header className="space-y-1">
        <h1
          id="admin-products-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Gestion des produits
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Cree, modifie et supprime les produits du catalogue.
        </p>
      </header>

      {errorMessage ? (
        <div
          className="flex items-start gap-2 rounded-xl border border-brand-error/20 bg-red-50 p-4 text-sm text-brand-error"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {noticeMessage ? (
        <div
          className="rounded-xl border border-brand-success/20 bg-emerald-50 p-4 text-sm text-brand-success"
          role="status"
          aria-live="polite"
        >
          {noticeMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Filtres catalogue</CardTitle>
          <CardDescription>
            Affinez la liste des produits par statut, categorie ou recherche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"
            onSubmit={handleApplyFilters}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nom ou slug"
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut</span>
              <select
                value={statusInput}
                onChange={(event) =>
                  setStatusInput(event.target.value as ProductFilterStatus)
                }
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="publie">Publie</option>
                <option value="brouillon">Brouillon</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Categorie</span>
              <select
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
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

            <div className="flex items-end gap-2">
              <Button type="submit" className="w-full md:w-auto">
                Filtrer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="w-full md:w-auto"
              >
                Reinit.
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Liste des produits</CardTitle>
            <CardDescription>
              {isLoading
                ? "Chargement des produits..."
                : `${productsCount} produit(s) affiche(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-3">Nom</th>
                    <th className="px-2 py-3">Slug</th>
                    <th className="px-2 py-3">Statut</th>
                    <th className="px-2 py-3">Prix TTC</th>
                    <th className="px-2 py-3">Stock</th>
                    <th className="px-2 py-3">Categories</th>
                    <th className="px-2 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && products.length === 0 ? (
                    <tr>
                      <td className="px-2 py-6 text-slate-500" colSpan={7}>
                        Aucun produit ne correspond aux filtres actuels.
                      </td>
                    </tr>
                  ) : null}

                  {products.map((product) => (
                    <tr
                      key={product.id_produit}
                      className="border-b border-border/60"
                    >
                      <td className="px-2 py-3 align-top">
                        <p className="font-medium text-brand-nav">
                          {product.nom}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {product.description || "-"}
                        </p>
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-slate-600">
                        {product.slug}
                      </td>
                      <td className="px-2 py-3 align-top">
                        <Badge
                          className={cn(
                            "border-transparent",
                            mapProductStatusClassName(product.statut),
                          )}
                        >
                          {mapProductStatusLabel(product.statut)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 align-top text-slate-700">
                        {formatCurrency(product.prix_ttc)}
                      </td>
                      <td className="px-2 py-3 align-top text-slate-700">
                        {product.quantite_stock}
                      </td>
                      <td className="px-2 py-3 align-top">
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
                      <td className="px-2 py-3 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(product)}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={deletingProductId === product.id_produit}
                            className="text-brand-error hover:text-brand-error"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            {deletingProductId === product.id_produit
                              ? "Suppression..."
                              : "Supprimer"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nouveau produit</CardTitle>
              <CardDescription>
                Ajoutez un produit et assignez ses categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleCreateProduct}>
                <label className="block space-y-1 text-sm text-slate-700">
                  <span>Nom</span>
                  <input
                    type="text"
                    required
                    value={createForm.nom}
                    onChange={(event) =>
                      setCreateForm((previousValue) => ({
                        ...previousValue,
                        nom: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-border px-3"
                  />
                </label>

                <label className="block space-y-1 text-sm text-slate-700">
                  <span>Description</span>
                  <textarea
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((previousValue) => ({
                        ...previousValue,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-md border border-border px-3 py-2"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-sm text-slate-700">
                    <span>Prix TTC</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={createForm.prix_ttc}
                      onChange={(event) =>
                        setCreateForm((previousValue) => ({
                          ...previousValue,
                          prix_ttc: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border px-3"
                    />
                  </label>
                  <label className="block space-y-1 text-sm text-slate-700">
                    <span>Stock</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={createForm.quantite_stock}
                      onChange={(event) =>
                        setCreateForm((previousValue) => ({
                          ...previousValue,
                          quantite_stock: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border px-3"
                    />
                  </label>
                </div>

                <label className="block space-y-1 text-sm text-slate-700">
                  <span>Statut</span>
                  <select
                    value={createForm.statut}
                    onChange={(event) =>
                      setCreateForm((previousValue) => ({
                        ...previousValue,
                        statut: event.target.value as ProductStatus,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-border px-3"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="publie">Publie</option>
                  </select>
                </label>

                <label className="block space-y-1 text-sm text-slate-700">
                  <span>Slug (optionnel)</span>
                  <input
                    type="text"
                    value={createForm.slug}
                    onChange={(event) =>
                      setCreateForm((previousValue) => ({
                        ...previousValue,
                        slug: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-border px-3"
                  />
                </label>

                <fieldset className="space-y-2 rounded-md border border-border p-3">
                  <legend className="px-1 text-sm font-medium text-slate-700">
                    Categories
                  </legend>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {categories.map((category) => {
                      const isSelected = createForm.categoryIds.includes(
                        category.id_categorie,
                      )

                      return (
                        <label
                          key={`create-${category.id_categorie}`}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              setCreateForm((previousValue) => ({
                                ...previousValue,
                                categoryIds: toggleCategorySelection(
                                  previousValue.categoryIds,
                                  category.id_categorie,
                                ),
                              }))
                            }
                          />
                          <span>{category.nom}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <Button type="submit" disabled={isCreating} className="w-full">
                  <Plus className="size-4" aria-hidden="true" />
                  {isCreating ? "Creation..." : "Creer le produit"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {selectedProduct ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Edition produit</CardTitle>
                <CardDescription>{selectedProduct.nom}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleUpdateProduct}>
                  <label className="block space-y-1 text-sm text-slate-700">
                    <span>Nom</span>
                    <input
                      type="text"
                      required
                      value={editForm.nom}
                      onChange={(event) =>
                        setEditForm((previousValue) => ({
                          ...previousValue,
                          nom: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border px-3"
                    />
                  </label>

                  <label className="block space-y-1 text-sm text-slate-700">
                    <span>Description</span>
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((previousValue) => ({
                          ...previousValue,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-md border border-border px-3 py-2"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1 text-sm text-slate-700">
                      <span>Prix TTC</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={editForm.prix_ttc}
                        onChange={(event) =>
                          setEditForm((previousValue) => ({
                            ...previousValue,
                            prix_ttc: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border px-3"
                      />
                    </label>
                    <label className="block space-y-1 text-sm text-slate-700">
                      <span>Stock</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editForm.quantite_stock}
                        onChange={(event) =>
                          setEditForm((previousValue) => ({
                            ...previousValue,
                            quantite_stock: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-md border border-border px-3"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1 text-sm text-slate-700">
                    <span>Statut</span>
                    <select
                      value={editForm.statut}
                      onChange={(event) =>
                        setEditForm((previousValue) => ({
                          ...previousValue,
                          statut: event.target.value as ProductStatus,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border px-3"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="publie">Publie</option>
                    </select>
                  </label>

                  <label className="block space-y-1 text-sm text-slate-700">
                    <span>Slug</span>
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={(event) =>
                        setEditForm((previousValue) => ({
                          ...previousValue,
                          slug: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-md border border-border px-3"
                    />
                  </label>

                  <fieldset className="space-y-2 rounded-md border border-border p-3">
                    <legend className="px-1 text-sm font-medium text-slate-700">
                      Categories
                    </legend>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {categories.map((category) => {
                        const isSelected = editForm.categoryIds.includes(
                          category.id_categorie,
                        )

                        return (
                          <label
                            key={`edit-${category.id_categorie}`}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                setEditForm((previousValue) => ({
                                  ...previousValue,
                                  categoryIds: toggleCategorySelection(
                                    previousValue.categoryIds,
                                    category.id_categorie,
                                  ),
                                }))
                              }
                            />
                            <span>{category.nom}</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isUpdating}>
                      <RefreshCw className="size-4" aria-hidden="true" />
                      {isUpdating ? "Mise a jour..." : "Enregistrer"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      <X className="size-4" aria-hidden="true" />
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  )
}
