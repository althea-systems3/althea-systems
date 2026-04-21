"use client"

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Eye,
  Filter,
  Pencil,
  Power,
  RefreshCw,
  Search,
} from "lucide-react"
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
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { formatCurrency, formatDate } from "@/features/admin/adminUtils"

import { fetchAdminUsers, updateAdminUserStatus } from "./adminUsersApi"
import type {
  AdminUserListItem,
  AdminUsersFilters,
  AdminUsersListPayload,
} from "./adminUsersTypes"
import {
  ADMIN_USERS_SORT_LABELS,
  buildAdminUsersQueryString,
  getNextSortDirection,
  mapUserStatusUi,
  parseAdminUsersFiltersFromSearchParams,
  truncateBillingAddresses,
} from "./adminUsersUtils"

function getProblematicRowClassName(user: AdminUserListItem): string {
  if (user.statut === "inactif") {
    return "bg-red-50/50"
  }

  if (user.statut === "en_attente") {
    return "bg-amber-50/60"
  }

  return ""
}

export function AdminUsersListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const searchParamsSnapshot = searchParams.toString()

  const filters = useMemo(() => {
    return parseAdminUsersFiltersFromSearchParams(
      new URLSearchParams(searchParamsSnapshot),
    )
  }, [searchParamsSnapshot])

  const [searchNameDraft, setSearchNameDraft] = useState(filters.searchName)
  const [searchEmailDraft, setSearchEmailDraft] = useState(filters.searchEmail)

  const [usersPayload, setUsersPayload] =
    useState<AdminUsersListPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  useEffect(() => {
    setSearchNameDraft(filters.searchName)
    setSearchEmailDraft(filters.searchEmail)
  }, [filters.searchEmail, filters.searchName])

  const replaceFiltersInUrl = useCallback(
    (nextFilters: AdminUsersFilters) => {
      const queryString = buildAdminUsersQueryString(nextFilters)
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router],
  )

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const payload = await fetchAdminUsers(filters)
      setUsersPayload(payload)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const users = usersPayload?.users ?? []
  const total = usersPayload?.total ?? 0
  const page = usersPayload?.page ?? filters.page
  const totalPages = usersPayload?.totalPages ?? 1

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    replaceFiltersInUrl({
      ...filters,
      searchName: searchNameDraft,
      searchEmail: searchEmailDraft,
      page: 1,
    })
  }

  function handleResetFilters() {
    replaceFiltersInUrl({
      searchName: "",
      searchEmail: "",
      status: "all",
      sortBy: "date_inscription",
      sortDirection: "desc",
      page: 1,
      pageSize: filters.pageSize,
    })
  }

  function handleSort(sortBy: AdminUsersFilters["sortBy"]) {
    replaceFiltersInUrl({
      ...filters,
      sortBy,
      sortDirection: getNextSortDirection(
        filters.sortBy,
        filters.sortDirection,
        sortBy,
      ),
      page: 1,
    })
  }

  function handlePageChange(nextPage: number) {
    replaceFiltersInUrl({
      ...filters,
      page: nextPage,
    })
  }

  async function handleToggleStatus(user: AdminUserListItem) {
    const nextStatus = user.statut === "actif" ? "inactif" : "actif"
    setTogglingUserId(user.id_utilisateur)
    setErrorMessage(null)

    try {
      await updateAdminUserStatus(user.id_utilisateur, nextStatus)
      await loadUsers()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le statut.",
      )
    } finally {
      setTogglingUserId(null)
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-users-list-title">
      <header className="space-y-1">
        <h1
          id="admin-users-list-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Gestion des utilisateurs
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Vue de suivi des comptes utilisateurs, de leur activité commerciale et
          de leurs statuts.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">
            Recherche, filtres et tri
          </CardTitle>
          <CardDescription>
            Trouvez rapidement les cas sensibles: comptes en attente, inactifs,
            sans commandes ou CA faible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="grid gap-3 xl:grid-cols-[1fr_1fr_auto_auto]"
            onSubmit={handleSearchSubmit}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche par nom</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchNameDraft}
                  onChange={(event) => {
                    setSearchNameDraft(event.target.value)
                  }}
                  placeholder="Nom complet"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche par email</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchEmailDraft}
                  onChange={(event) => {
                    setSearchEmailDraft(event.target.value)
                  }}
                  placeholder="client@domaine.com"
                  className="h-10 w-full rounded-md border border-border pl-9 pr-3"
                />
              </div>
            </label>

            <div className="flex items-end">
              <Button type="submit" className="w-full xl:w-auto">
                <Filter className="size-4" aria-hidden="true" />
                Filtrer
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full xl:w-auto"
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
                  replaceFiltersInUrl({
                    ...filters,
                    status: event.target.value as AdminUsersFilters["status"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="en_attente">En attente</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Trier par</span>
              <select
                value={filters.sortBy}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortBy: event.target.value as AdminUsersFilters["sortBy"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="nom">Nom</option>
                <option value="date_inscription">
                  Date d&apos;inscription
                </option>
                <option value="nombre_commandes">Nombre de commandes</option>
                <option value="ca_total">CA total</option>
                <option value="derniere_connexion">Dernière connexion</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Direction</span>
              <select
                value={filters.sortDirection}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    sortDirection: event.target
                      .value as AdminUsersFilters["sortDirection"],
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="asc">Ascendant</option>
                <option value="desc">Descendant</option>
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Taille page</span>
              <select
                value={filters.pageSize}
                onChange={(event) => {
                  replaceFiltersInUrl({
                    ...filters,
                    pageSize: Number(event.target.value),
                    page: 1,
                  })
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-brand-nav">Liste</CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des utilisateurs..."
              : `${total} utilisateur(s) trouvé(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1450px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("nom")
                      }}
                    >
                      Nom complet
                      {filters.sortBy === "nom" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">E-mail</th>
                  <th className="px-2 py-3">Statut</th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("nombre_commandes")
                      }}
                    >
                      Nb commandes
                      {filters.sortBy === "nombre_commandes" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("ca_total")
                      }}
                    >
                      CA total
                      {filters.sortBy === "ca_total" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("derniere_connexion")
                      }}
                    >
                      Dernière connexion
                      {filters.sortBy === "derniere_connexion" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1"
                      onClick={() => {
                        handleSort("date_inscription")
                      }}
                    >
                      Date inscription
                      {filters.sortBy === "date_inscription" ? (
                        filters.sortDirection === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  </th>
                  <th className="px-2 py-3">Adresses facturation</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-2 py-8 text-center text-slate-500"
                    >
                      Aucun utilisateur correspondant aux filtres.
                    </td>
                  </tr>
                ) : null}

                {users.map((user) => {
                  const statusUi = mapUserStatusUi(user.statut)
                  const billingAddresses = truncateBillingAddresses(
                    user.adresses_facturation,
                  )

                  return (
                    <tr
                      key={user.id_utilisateur}
                      className={`border-b border-border/60 align-top ${getProblematicRowClassName(
                        user,
                      )}`}
                    >
                      <td className="px-2 py-3">
                        <p className="font-medium text-brand-nav">
                          {user.nom_complet || "-"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.est_admin ? "Administrateur" : "Client"}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        <p>{user.email}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.email_verifie
                            ? "Email vérifié"
                            : "Email non vérifié"}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        <Badge className={statusUi.className}>
                          {statusUi.label}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {user.nombre_commandes}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatCurrency(user.chiffre_affaires_total)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatDate(user.derniere_connexion)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        {formatDate(user.date_inscription)}
                      </td>
                      <td className="px-2 py-3 text-xs text-slate-700">
                        {billingAddresses.preview.length === 0 ? (
                          <span className="text-slate-500">Aucune adresse</span>
                        ) : (
                          <div className="space-y-1">
                            {billingAddresses.preview.map((addressLabel) => (
                              <p key={`${user.id_utilisateur}-${addressLabel}`}>
                                {addressLabel}
                              </p>
                            ))}
                            {billingAddresses.remainingCount > 0 ? (
                              <p className="text-slate-500">
                                +{billingAddresses.remainingCount} autre(s)
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/admin/utilisateurs/${user.id_utilisateur}`}
                            >
                              <Eye className="size-3.5" aria-hidden="true" />
                              Voir
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/admin/utilisateurs/${user.id_utilisateur}/edition`}
                            >
                              <Pencil className="size-3.5" aria-hidden="true" />
                              Éditer
                            </Link>
                          </Button>
                          {!user.est_admin ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void handleToggleStatus(user)}
                              disabled={
                                togglingUserId === user.id_utilisateur ||
                                user.statut === "en_attente"
                              }
                              aria-label={
                                user.statut === "actif"
                                  ? "Désactiver le compte"
                                  : "Activer le compte"
                              }
                            >
                              <Power
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              {user.statut === "actif"
                                ? "Désactiver"
                                : "Activer"}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {!isLoading && users.length === 0 ? (
              <p className="rounded-md border border-border p-4 text-sm text-slate-500">
                Aucun utilisateur correspondant aux filtres.
              </p>
            ) : null}

            {users.map((user) => {
              const statusUi = mapUserStatusUi(user.statut)

              return (
                <article
                  key={`mobile-${user.id_utilisateur}`}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-nav">
                        {user.nom_complet || "-"}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Badge className={statusUi.className}>
                      {statusUi.label}
                    </Badge>
                  </div>

                  <dl className="mt-3 grid gap-1 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <dt>Commandes</dt>
                      <dd>{user.nombre_commandes}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>CA total</dt>
                      <dd>{formatCurrency(user.chiffre_affaires_total)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt>Dernière connexion</dt>
                      <dd>{formatDate(user.derniere_connexion)}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/utilisateurs/${user.id_utilisateur}`}>
                        <Eye className="size-3.5" aria-hidden="true" />
                        Voir
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/admin/utilisateurs/${user.id_utilisateur}/edition`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Éditer
                      </Link>
                    </Button>
                    {!user.est_admin ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleToggleStatus(user)}
                        disabled={
                          togglingUserId === user.id_utilisateur ||
                          user.statut === "en_attente"
                        }
                      >
                        <Power className="size-3.5" aria-hidden="true" />
                        {user.statut === "actif" ? "Désactiver" : "Activer"}
                      </Button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-slate-600">
              Page {page} / {totalPages} · Tri:{" "}
              {ADMIN_USERS_SORT_LABELS[filters.sortBy]} ({filters.sortDirection}
              )
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handlePageChange(Math.max(1, page - 1))
                }}
                disabled={page <= 1 || isLoading}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handlePageChange(Math.min(totalPages, page + 1))
                }}
                disabled={page >= totalPages || isLoading}
              >
                Suivant
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadUsers()
                }}
                disabled={isLoading}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Rafraîchir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
