"use client"

import { AlertCircle, Eye, RefreshCw, Search } from "lucide-react"
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
import { parseApiResponse } from "@/features/admin/adminApi"
import { formatDate } from "@/features/admin/adminUtils"

type AdminUser = {
  id_utilisateur: string
  email: string
  nom_complet: string
  est_admin: boolean
  statut: string
  date_inscription: string
}

type UsersPayload = {
  users: AdminUser[]
}

type UserAddress = {
  id_adresse: string
  prenom: string | null
  nom: string | null
  adresse_1: string | null
  adresse_2: string | null
  ville: string | null
  region: string | null
  code_postal: string | null
  pays: string | null
  telephone: string | null
}

type UserPaymentMethod = {
  id_paiement: string
  nom_carte: string | null
  derniers_4_chiffres: string | null
  date_expiration: string | null
  stripe_payment_id: string | null
  est_defaut: boolean | null
}

type UserDetail = {
  id_utilisateur: string
  email: string
  nom_complet: string | null
  est_admin: boolean
  statut: string
  email_verifie: boolean | null
  date_inscription: string | null
  cgu_acceptee_le: string | null
  date_validation_email: string | null
}

type UserDetailPayload = {
  user: UserDetail
  addresses: UserAddress[]
  paymentMethods: UserPaymentMethod[]
}

export function AdminUsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [searchValue, setSearchValue] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetailPayload | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const searchParams = new URLSearchParams()

      if (appliedSearch.trim()) {
        searchParams.set("search", appliedSearch.trim())
      }

      const endpoint = searchParams.toString()
        ? `/api/admin/utilisateurs?${searchParams.toString()}`
        : "/api/admin/utilisateurs"

      const response = await fetch(endpoint, { cache: "no-store" })

      const payload = await parseApiResponse<UsersPayload>(
        response,
        "Impossible de charger les utilisateurs.",
      )

      setUsers(payload.users)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les utilisateurs.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [appliedSearch])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const handleApplySearch = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    setAppliedSearch(searchValue)
  }

  const handleResetSearch = () => {
    setSearchValue("")
    setAppliedSearch("")
  }

  const handleOpenUserDetail = async (userId: string) => {
    setSelectedUserId(userId)
    setUserDetail(null)
    setIsDetailLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/utilisateurs/${userId}`, {
        cache: "no-store",
      })

      const payload = await parseApiResponse<UserDetailPayload>(
        response,
        "Impossible de charger le detail utilisateur.",
      )

      setUserDetail(payload)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le detail utilisateur.",
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  const selectedUserSummary = useMemo(() => {
    if (!selectedUserId) {
      return null
    }

    return users.find((user) => user.id_utilisateur === selectedUserId) ?? null
  }, [selectedUserId, users])

  return (
    <section className="space-y-6" aria-labelledby="admin-users-title">
      <header className="space-y-1">
        <h1
          id="admin-users-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Gestion des utilisateurs
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Recherchez des comptes clients et consultez leurs informations
          detaillees.
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
          <CardTitle className="text-xl">Recherche utilisateurs</CardTitle>
          <CardDescription>
            Recherchez par email ou nom complet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto_auto]"
            onSubmit={handleApplySearch}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche</span>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="nom@domaine.com"
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                <Search className="size-4" aria-hidden="true" />
                Rechercher
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetSearch}
                className="w-full md:w-auto"
              >
                Reinit.
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Liste des utilisateurs</CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des utilisateurs..."
              : `${users.length} utilisateur(s) trouve(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Nom</th>
                  <th className="px-2 py-3">Email</th>
                  <th className="px-2 py-3">Role</th>
                  <th className="px-2 py-3">Statut</th>
                  <th className="px-2 py-3">Inscription</th>
                  <th className="px-2 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && users.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-slate-500" colSpan={6}>
                      Aucun utilisateur trouve.
                    </td>
                  </tr>
                ) : null}

                {users.map((user) => (
                  <tr
                    key={user.id_utilisateur}
                    className="border-b border-border/60"
                  >
                    <td className="px-2 py-3 align-top font-medium text-brand-nav">
                      {user.nom_complet || "-"}
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {user.email}
                    </td>
                    <td className="px-2 py-3 align-top">
                      {user.est_admin ? (
                        <Badge className="border-transparent bg-brand-nav text-white">
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">Client</Badge>
                      )}
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {user.statut}
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {formatDate(user.date_inscription)}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void handleOpenUserDetail(user.id_utilisateur)
                        }
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedUserId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Detail utilisateur{" "}
              {selectedUserSummary?.nom_complet ?? selectedUserId}
            </CardTitle>
            <CardDescription>
              Profil, adresses enregistrees et moyens de paiement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDetailLoading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : null}

            {!isDetailLoading && userDetail ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-brand-nav">
                      {userDetail.user.email}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="font-medium text-brand-nav">
                      {userDetail.user.est_admin ? "Administrateur" : "Client"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Statut compte</p>
                    <p className="font-medium text-brand-nav">
                      {userDetail.user.statut}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Email verifie</p>
                    <p className="font-medium text-brand-nav">
                      {userDetail.user.email_verifie ? "Oui" : "Non"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Date inscription</p>
                    <p className="font-medium text-brand-nav">
                      {formatDate(userDetail.user.date_inscription)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">CGU acceptees</p>
                    <p className="font-medium text-brand-nav">
                      {formatDate(userDetail.user.cgu_acceptee_le)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <h3 className="heading-font text-base text-brand-nav">
                      Adresses
                    </h3>
                    {userDetail.addresses.length > 0 ? (
                      userDetail.addresses.map((address) => (
                        <article
                          key={address.id_adresse}
                          className="rounded-md border border-border/70 bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <p className="font-medium text-brand-nav">
                            {address.prenom ?? ""} {address.nom ?? ""}
                          </p>
                          <p>{address.adresse_1 ?? ""}</p>
                          {address.adresse_2 ? (
                            <p>{address.adresse_2}</p>
                          ) : null}
                          <p>
                            {address.code_postal ?? ""} {address.ville ?? ""}
                          </p>
                          <p>{address.pays ?? ""}</p>
                          <p>{address.telephone ?? ""}</p>
                        </article>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">
                        Aucune adresse enregistree.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border border-border p-3">
                    <h3 className="heading-font text-base text-brand-nav">
                      Moyens de paiement
                    </h3>
                    {userDetail.paymentMethods.length > 0 ? (
                      userDetail.paymentMethods.map((paymentMethod) => (
                        <article
                          key={paymentMethod.id_paiement}
                          className="rounded-md border border-border/70 bg-slate-50 p-3 text-sm text-slate-700"
                        >
                          <p className="font-medium text-brand-nav">
                            {paymentMethod.nom_carte ?? "Carte"}
                          </p>
                          <p>
                            **** {paymentMethod.derniers_4_chiffres ?? "----"} |
                            Exp: {paymentMethod.date_expiration ?? "--/--"}
                          </p>
                          <p>{paymentMethod.stripe_payment_id ?? ""}</p>
                          <p>
                            {paymentMethod.est_defaut
                              ? "Carte par defaut"
                              : "Carte secondaire"}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">
                        Aucun moyen de paiement.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {!isDetailLoading && !userDetail ? (
              <p className="text-sm text-slate-600">Aucun detail a afficher.</p>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedUserId(null)
                  setUserDetail(null)
                }}
              >
                Fermer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadUsers()}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Rafraichir
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
