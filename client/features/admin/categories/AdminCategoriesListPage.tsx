"use client"

import {
  Eye,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
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
import {
  AdminListErrorAlert,
  AdminListNoticeAlert,
  AdminSortButton,
} from "@/features/admin/shared"
import { Link, usePathname, useRouter } from "@/i18n/navigation"

import {
  deleteAdminCategory,
  fetchAdminCategories,
  runAdminCategoriesBulkStatusAction,
  reorderAdminCategories,
} from "./adminCategoriesApi"
import type {
  AdminCategoriesBulkAction,
  AdminCategory,
  AdminCategorySortBy,
} from "./adminCategoriesTypes"
import {
  ADMIN_CATEGORY_SORT_LABELS,
  buildAdminCategoriesQueryString,
  getCategoryImageAlt,
  getNextSortDirection,
  mapCategoryStatusUi,
  parseAdminCategoriesFiltersFromSearchParams,
  moveCategoryByOffset,
  reorderCategoriesByDragAndDrop,
} from "./adminCategoriesUtils"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

function toggleSelection(selectedIds: string[], categoryId: string): string[] {
  if (selectedIds.includes(categoryId)) {
    return selectedIds.filter((id) => id !== categoryId)
  }

  return [...selectedIds, categoryId]
}

function buildReorderPayload(categories: AdminCategory[]) {
  return categories.map((category) => ({
    id: category.id_categorie,
    ordre_affiche: category.ordre_affiche,
  }))
}

export function AdminCategoriesListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const searchParamsSnapshot = searchParams.toString()

  const filters = useMemo(() => {
    return parseAdminCategoriesFiltersFromSearchParams(
      new URLSearchParams(searchParamsSnapshot),
    )
  }, [searchParamsSnapshot])

  const [searchDraft, setSearchDraft] = useState(filters.search)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false)
  const [isReorderLoading, setIsReorderLoading] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  )

  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(
    null,
  )
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(
    null,
  )

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    setSearchDraft(filters.search)
  }, [filters.search])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)")

    function updatePointerMode() {
      setIsCoarsePointer(mediaQuery.matches)
    }

    updatePointerMode()

    mediaQuery.addEventListener("change", updatePointerMode)

    return () => {
      mediaQuery.removeEventListener("change", updatePointerMode)
    }
  }, [])

  const replaceFiltersInUrl = useCallback(
    (nextFilters: {
      search: string
      status: "all" | "active" | "inactive"
      sortBy: "nom" | "nombre_produits" | "ordre_affiche"
      sortDirection: "asc" | "desc"
    }) => {
      const queryString = buildAdminCategoriesQueryString(nextFilters)
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router],
  )

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const fetchedCategories = await fetchAdminCategories(filters)
      setCategories(fetchedCategories)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger la liste des catégories.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    setSelectedCategoryIds((previousSelection) => {
      const currentIds = new Set(
        categories.map((category) => category.id_categorie),
      )
      return previousSelection.filter((categoryId) =>
        currentIds.has(categoryId),
      )
    })
  }, [categories])

  const selectedCount = selectedCategoryIds.length

  const areAllVisibleCategoriesSelected = useMemo(() => {
    if (categories.length === 0) {
      return false
    }

    return categories.every((category) =>
      selectedCategoryIds.includes(category.id_categorie),
    )
  }, [categories, selectedCategoryIds])

  const isReorderEnabled = useMemo(() => {
    return (
      !isCoarsePointer &&
      filters.sortBy === "ordre_affiche" &&
      filters.sortDirection === "asc" &&
      filters.status === "all" &&
      !filters.search
    )
  }, [
    filters.search,
    filters.sortBy,
    filters.sortDirection,
    filters.status,
    isCoarsePointer,
  ])

  async function persistReorder(nextCategories: AdminCategory[]) {
    setIsReorderLoading(true)
    setErrorMessage(null)

    try {
      await reorderAdminCategories(buildReorderPayload(nextCategories))
      setNoticeMessage("Ordre des catégories mis à jour.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de sauvegarder la réorganisation.",
      )

      try {
        const freshCategories = await fetchAdminCategories(filters)
        setCategories(freshCategories)
      } catch {
        // Keep local state if refresh fails.
      }
    } finally {
      setIsReorderLoading(false)
      setDraggedCategoryId(null)
      setDragOverCategoryId(null)
    }
  }

  function handleSort(nextSortBy: AdminCategorySortBy) {
    replaceFiltersInUrl({
      ...filters,
      sortBy: nextSortBy,
      sortDirection: getNextSortDirection(
        filters.sortBy,
        filters.sortDirection,
        nextSortBy,
      ),
    })
  }

  function handleSearchSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()

    replaceFiltersInUrl({
      ...filters,
      search: searchDraft,
    })
  }

  function handleResetFilters() {
    replaceFiltersInUrl({
      search: "",
      status: "all",
      sortBy: "ordre_affiche",
      sortDirection: "asc",
    })
  }

  function handleToggleAllVisibleRows() {
    setSelectedCategoryIds((previousSelection) => {
      if (areAllVisibleCategoriesSelected) {
        const visibleIds = new Set(
          categories.map((category) => category.id_categorie),
        )
        return previousSelection.filter((id) => !visibleIds.has(id))
      }

      const mergedSelection = new Set(previousSelection)
      categories.forEach((category) => {
        mergedSelection.add(category.id_categorie)
      })

      return Array.from(mergedSelection)
    })
  }

  async function handleDeleteCategory(category: AdminCategory) {
    const shouldDelete = await confirmCriticalAction({
      title: "Supprimer la catégorie",
      message: `Supprimer la catégorie "${category.nom}" ? Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!shouldDelete) {
      return
    }

    setDeletingCategoryId(category.id_categorie)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await deleteAdminCategory(category.id_categorie)
      setNoticeMessage("Catégorie supprimée avec succès.")
      await loadCategories()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette catégorie.",
      )
    } finally {
      setDeletingCategoryId(null)
    }
  }

  async function handleBulkStatusAction(action: AdminCategoriesBulkAction) {
    if (selectedCategoryIds.length === 0) {
      return
    }

    const actionLabel = action === "activate" ? "activer" : "désactiver"
    const shouldApply = await confirmCriticalAction({
      title: "Confirmer l'action groupée",
      message: `Confirmer l'action groupée: ${actionLabel} ${selectedCategoryIds.length} catégorie(s) ?`,
      confirmLabel: "Appliquer",
      tone: "warning",
    })

    if (!shouldApply) {
      return
    }

    setIsBulkActionLoading(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const payload = await runAdminCategoriesBulkStatusAction({
        action,
        categoryIds: selectedCategoryIds,
      })

      setNoticeMessage(
        `${payload.affectedCount} catégorie(s) mise(s) à jour avec succès.`,
      )
      setSelectedCategoryIds([])
      await loadCategories()
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

  async function handleMoveCategory(categoryId: string, offset: number) {
    if (!isReorderEnabled || isReorderLoading) {
      return
    }

    const nextCategories = moveCategoryByOffset(categories, categoryId, offset)

    if (nextCategories === categories) {
      return
    }

    setCategories(nextCategories)
    await persistReorder(nextCategories)
  }

  function handleRowDragStart(categoryId: string) {
    if (!isReorderEnabled || isReorderLoading) {
      return
    }

    setDraggedCategoryId(categoryId)
    setNoticeMessage(null)
  }

  function handleRowDragOver(
    dragEvent: React.DragEvent<HTMLTableRowElement>,
    categoryId: string,
  ) {
    if (!isReorderEnabled || isReorderLoading || !draggedCategoryId) {
      return
    }

    dragEvent.preventDefault()

    if (dragOverCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId)
    }
  }

  async function handleRowDrop(categoryId: string) {
    if (!isReorderEnabled || isReorderLoading || !draggedCategoryId) {
      return
    }

    const reorderedCategories = reorderCategoriesByDragAndDrop(
      categories,
      draggedCategoryId,
      categoryId,
    )

    if (reorderedCategories === categories) {
      setDraggedCategoryId(null)
      setDragOverCategoryId(null)
      return
    }

    setCategories(reorderedCategories)
    await persistReorder(reorderedCategories)
  }

  const sortLabel = ADMIN_CATEGORY_SORT_LABELS[filters.sortBy]

  return (
    <section className="space-y-6" aria-labelledby="admin-categories-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-categories-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Gestion des catégories
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Tableau hiérarchique des catégories avec tri, filtres, actions
            groupées et réorganisation.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/categories/nouvelle">
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle catégorie
          </Link>
        </Button>
      </header>

      <AdminListErrorAlert message={errorMessage} />
      <AdminListNoticeAlert message={noticeMessage} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Recherche, filtres et tri
          </CardTitle>
          <CardDescription>
            Tri actuel: {sortLabel} ({filters.sortDirection}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto]"
            onSubmit={handleSearchSubmit}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche par nom</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(event) => {
                    setSearchDraft(event.target.value)
                  }}
                  placeholder="Rechercher une catégorie"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <div className="flex items-end gap-2">
              <Button type="submit">
                <Filter className="size-4" aria-hidden="true" />
                Filtrer
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut</span>
              <select
                value={filters.status}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    status: event.target.value as "all" | "active" | "inactive",
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Toutes</option>
                <option value="active">Actives</option>
                <option value="inactive">Inactives</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Trier par</span>
              <select
                value={filters.sortBy}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortBy: event.target.value as AdminCategorySortBy,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="ordre_affiche">Ordre d&apos;affichage</option>
                <option value="nom">Nom</option>
                <option value="nombre_produits">Nombre de produits</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Direction</span>
              <select
                value={filters.sortDirection}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortDirection: event.target.value as "asc" | "desc",
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="asc">Ascendant</option>
                <option value="desc">Descendant</option>
              </select>
            </label>
          </div>

          {!isReorderEnabled ? (
            <p className="text-xs text-slate-500">
              Drag &amp; drop actif uniquement quand le tri est sur &quot;ordre
              d&apos;affichage&quot; en ascendant, sans recherche et sans filtre
              statut.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedCount > 0 ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Badge className="bg-brand-cta text-white">
              {selectedCount} sélectionnée(s)
            </Badge>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleBulkStatusAction("activate")
              }}
              disabled={isBulkActionLoading}
            >
              <Power className="size-4" aria-hidden="true" />
              Activer la sélection
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleBulkStatusAction("deactivate")
              }}
              disabled={isBulkActionLoading}
            >
              <Power className="size-4" aria-hidden="true" />
              Désactiver la sélection
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Tableau des catégories
          </CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement en cours..."
              : `${categories.length} catégorie(s) trouvée(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      checked={areAllVisibleCategoriesSelected}
                      onChange={handleToggleAllVisibleRows}
                    />
                  </th>
                  <th className="px-2 py-3">Réorganisation</th>
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
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="nombre_produits"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Nombre de produits
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">
                    <AdminSortButton
                      column="ordre_affiche"
                      currentSortBy={filters.sortBy}
                      currentDirection={filters.sortDirection}
                      onSort={handleSort}
                    >
                      Ordre d&apos;affichage
                    </AdminSortButton>
                  </th>
                  <th className="px-2 py-3">Statut</th>
                  <th className="px-2 py-3">Actions rapides</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && categories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-2 py-8 text-center text-sm text-slate-500"
                    >
                      Aucune catégorie ne correspond aux filtres actuels.
                    </td>
                  </tr>
                ) : null}

                {categories.map((category, index) => {
                  const statusUi = mapCategoryStatusUi(category.statut)
                  const isDragOver =
                    dragOverCategoryId === category.id_categorie

                  return (
                    <tr
                      key={category.id_categorie}
                      draggable={isReorderEnabled && !isReorderLoading}
                      onDragStart={() => {
                        handleRowDragStart(category.id_categorie)
                      }}
                      onDragOver={(event) => {
                        handleRowDragOver(event, category.id_categorie)
                      }}
                      onDrop={() => {
                        void handleRowDrop(category.id_categorie)
                      }}
                      onDragEnd={() => {
                        setDraggedCategoryId(null)
                        setDragOverCategoryId(null)
                      }}
                      className={`border-b border-border/60 align-top ${
                        isDragOver ? "bg-brand-cta/5" : ""
                      }`}
                    >
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${category.nom}`}
                          checked={selectedCategoryIds.includes(
                            category.id_categorie,
                          )}
                          onChange={() => {
                            setSelectedCategoryIds((previousSelection) => {
                              return toggleSelection(
                                previousSelection,
                                category.id_categorie,
                              )
                            })
                          }}
                        />
                      </td>

                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md border border-border px-2 py-1 text-xs ${
                              isReorderEnabled
                                ? "cursor-grab text-slate-700"
                                : "text-slate-400"
                            }`}
                            aria-label="Poignée de déplacement"
                            title={
                              isReorderEnabled
                                ? "Glisser pour réordonner"
                                : "Réorganisation désactivée"
                            }
                          >
                            <GripVertical
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="text-xs text-slate-600">
                            #{category.ordre_affiche}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void handleMoveCategory(category.id_categorie, -1)
                            }}
                            disabled={
                              !isReorderEnabled ||
                              isReorderLoading ||
                              index === 0
                            }
                          >
                            Monter
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              void handleMoveCategory(category.id_categorie, 1)
                            }}
                            disabled={
                              !isReorderEnabled ||
                              isReorderLoading ||
                              index === categories.length - 1
                            }
                          >
                            Descendre
                          </Button>
                        </div>
                      </td>

                      <td className="px-2 py-3">
                        {category.image_url ? (
                          <Image
                            src={category.image_url}
                            alt={getCategoryImageAlt(category.nom)}
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
                          {category.nom}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {category.slug}
                        </p>
                      </td>

                      <td className="px-2 py-3">
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {category.description || "-"}
                        </p>
                      </td>

                      <td className="px-2 py-3 text-xs text-slate-700">
                        {category.nombre_produits}
                      </td>

                      <td className="px-2 py-3 text-xs text-slate-700">
                        {category.ordre_affiche}
                      </td>

                      <td className="px-2 py-3">
                        <Badge className={statusUi.className}>
                          {statusUi.label}
                        </Badge>
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
                              href={`/admin/categories/${category.id_categorie}`}
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
                              href={`/admin/categories/${category.id_categorie}/edition`}
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
                              void handleDeleteCategory(category)
                            }}
                            disabled={
                              deletingCategoryId === category.id_categorie
                            }
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            {deletingCategoryId === category.id_categorie
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
        </CardContent>
      </Card>
    </section>
  )
}
