"use client"

import {
  AlertCircle,
  ArrowLeft,
  Mail,
  Save,
  ShieldAlert,
  ShieldOff,
  UserX,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/features/admin/adminUtils"
import { Link, useRouter } from "@/i18n/navigation"

import {
  deleteAdminUserWithRgpd,
  fetchAdminUserById,
  resetAdminUserPassword,
  sendAdminUserMail,
  updateAdminUserStatus,
} from "./adminUsersApi"
import type { AdminUserDetailPayload } from "./adminUsersTypes"
import { mapUserStatusUi } from "./adminUsersUtils"
import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

type AdminUserEditPageProps = {
  userId: string
}

const DEFAULT_MAIL_SUBJECT = "Message de l'équipe support Althea Systems"

export function AdminUserEditPage({ userId }: AdminUserEditPageProps) {
  const router = useRouter()

  const [payload, setPayload] = useState<AdminUserDetailPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [statusDraft, setStatusDraft] = useState<
    "actif" | "inactif" | "en_attente"
  >("actif")
  const [mailSubject, setMailSubject] = useState(DEFAULT_MAIL_SUBJECT)
  const [mailContent, setMailContent] = useState("")

  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [isMailSending, setIsMailSending] = useState(false)
  const [isResetSending, setIsResetSending] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [resetConfirmed, setResetConfirmed] = useState(false)
  const [deactivateConfirmed, setDeactivateConfirmed] = useState(false)
  const [rgpdAcknowledged, setRgpdAcknowledged] = useState(false)
  const [rgpdConfirmationText, setRgpdConfirmationText] = useState("")

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadDetail() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const nextPayload = await fetchAdminUserById(userId)

        if (isCancelled) {
          return
        }

        setPayload(nextPayload)
        setStatusDraft(nextPayload.user.statut)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger l'utilisateur.",
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
  }, [userId])

  async function reloadUser() {
    const nextPayload = await fetchAdminUserById(userId)
    setPayload(nextPayload)
    setStatusDraft(nextPayload.user.statut)
  }

  async function handleSaveStatus() {
    setIsStatusSaving(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await updateAdminUserStatus(userId, statusDraft)
      setNoticeMessage("Statut utilisateur mis à jour.")
      await reloadUser()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre à jour le statut.",
      )
    } finally {
      setIsStatusSaving(false)
    }
  }

  async function handleSendMail() {
    setIsMailSending(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await sendAdminUserMail(userId, {
        subject: mailSubject,
        content: mailContent,
      })

      setNoticeMessage("Mail envoyé avec succès.")
      setMailContent("")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer le mail.",
      )
    } finally {
      setIsMailSending(false)
    }
  }

  async function handleResetPassword() {
    if (!resetConfirmed) {
      setErrorMessage("Confirmez l'action avant d'envoyer le reset password.")
      return
    }

    setIsResetSending(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await resetAdminUserPassword(userId)
      setNoticeMessage("Lien de réinitialisation envoyé à l'utilisateur.")
      setResetConfirmed(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de déclencher le reset password.",
      )
    } finally {
      setIsResetSending(false)
    }
  }

  async function handleDeactivateAccount() {
    if (!deactivateConfirmed) {
      setErrorMessage("Confirmez la désactivation avant de continuer.")
      return
    }

    setIsDeactivating(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await updateAdminUserStatus(userId, "inactif")
      setNoticeMessage("Compte désactivé.")
      setDeactivateConfirmed(false)
      await reloadUser()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de désactiver le compte.",
      )
    } finally {
      setIsDeactivating(false)
    }
  }

  async function handleRgpdDelete() {
    if (!rgpdAcknowledged || rgpdConfirmationText !== "SUPPRIMER") {
      setErrorMessage(
        "Pour supprimer, cochez l'avertissement RGPD et saisissez SUPPRIMER.",
      )
      return
    }

    const userConfirmed = await confirmCriticalAction({
      title: "Suppression RGPD",
      message:
        "Suppression RGPD: cette action anonymise définitivement le compte. Confirmez-vous?",
      confirmLabel: "Supprimer",
      tone: "danger",
    })

    if (!userConfirmed) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      await deleteAdminUserWithRgpd(userId, rgpdConfirmationText)
      router.push("/admin/utilisateurs")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le compte.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-4" aria-labelledby="admin-user-edit-title">
        <h1
          id="admin-user-edit-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Édition utilisateur
        </h1>
        <Card>
          <CardContent className="p-6 text-sm text-slate-600">
            Chargement des actions administratives...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!payload) {
    return (
      <section className="space-y-4" aria-labelledby="admin-user-edit-title">
        <h1
          id="admin-user-edit-title"
          className="heading-font text-2xl text-brand-nav"
        >
          Édition utilisateur
        </h1>

        <Card>
          <CardContent className="p-6 text-sm text-brand-error">
            {errorMessage || "Utilisateur introuvable."}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { user, summary } = payload
  const statusUi = mapUserStatusUi(user.statut)

  return (
    <section className="space-y-6" aria-labelledby="admin-user-edit-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1
            id="admin-user-edit-title"
            className="heading-font text-2xl text-brand-nav sm:text-3xl"
          >
            Actions administratives · {user.nom_complet || "Utilisateur"}
          </h1>
          <p className="text-sm text-slate-600">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/utilisateurs/${userId}`}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour détail
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/utilisateurs">Retour liste</Link>
          </Button>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Contexte compte
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Statut actuel</p>
              <Badge className={`mt-1 ${statusUi.className}`}>
                {statusUi.label}
              </Badge>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Email vérifié</p>
              <p className="mt-1 font-medium text-brand-nav">
                {user.email_verifie ? "Oui" : "Non"}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Dernière connexion</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(user.derniere_connexion)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Date inscription</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatDate(user.date_inscription)}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">Commandes</p>
              <p className="mt-1 font-medium text-brand-nav">
                {summary.nombre_commandes}
              </p>
            </div>
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-slate-500">CA total</p>
              <p className="mt-1 font-medium text-brand-nav">
                {formatCurrency(summary.chiffre_affaires_total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Statut du compte
            </CardTitle>
            <CardDescription>
              Modifiez le statut (actif, inactif, en attente) avec application
              immédiate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Nouveau statut</span>
              <select
                value={statusDraft}
                onChange={(event) => {
                  setStatusDraft(
                    event.target.value as "actif" | "inactif" | "en_attente",
                  )
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="en_attente">En attente</option>
              </select>
            </label>

            <Button
              type="button"
              onClick={() => void handleSaveStatus()}
              disabled={isStatusSaving}
            >
              <Save className="size-4" aria-hidden="true" />
              {isStatusSaving ? "Enregistrement..." : "Enregistrer le statut"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Envoyer un mail
            </CardTitle>
            <CardDescription>
              Message manuel administrateur: sujet + contenu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Sujet</span>
              <input
                type="text"
                value={mailSubject}
                onChange={(event) => {
                  setMailSubject(event.target.value)
                }}
                className="h-10 w-full rounded-md border border-border px-3"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Contenu</span>
              <textarea
                rows={6}
                value={mailContent}
                onChange={(event) => {
                  setMailContent(event.target.value)
                }}
                className="w-full rounded-md border border-border px-3 py-2"
                placeholder="Rédigez le message envoyé à l'utilisateur"
              />
            </label>

            <Button
              type="button"
              onClick={() => {
                void handleSendMail()
              }}
              disabled={isMailSending}
            >
              <Mail className="size-4" aria-hidden="true" />
              {isMailSending ? "Envoi..." : "Envoyer le mail"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Réinitialiser le mot de passe
            </CardTitle>
            <CardDescription>
              Envoie un lien de réinitialisation au compte sélectionné.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(event) => {
                  setResetConfirmed(event.target.checked)
                }}
              />
              <span>
                Je confirme l&apos;envoi d&apos;un lien de réinitialisation de
                mot de passe.
              </span>
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleResetPassword()
              }}
              disabled={isResetSending}
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              {isResetSending ? "Envoi..." : "Envoyer reset password"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-brand-nav">
              Désactiver le compte
            </CardTitle>
            <CardDescription>
              Blocage immédiat de l&apos;accès utilisateur sans suppression
              RGPD.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={deactivateConfirmed}
                onChange={(event) => {
                  setDeactivateConfirmed(event.target.checked)
                }}
              />
              <span>Je confirme la désactivation immédiate du compte.</span>
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleDeactivateAccount()
              }}
              disabled={isDeactivating}
            >
              <ShieldOff className="size-4" aria-hidden="true" />
              {isDeactivating ? "Désactivation..." : "Désactiver le compte"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-brand-error/30">
          <CardHeader>
            <CardTitle className="text-xl text-brand-error">
              Suppression avec avertissement RGPD
            </CardTitle>
            <CardDescription>
              Action sensible: anonymisation définitive des données
              personnelles. Cette opération est distincte d&apos;une simple
              désactivation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-brand-alert/30 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Impact métier RGPD</p>
              <p>
                Le compte est anonymisé, les informations personnelles sont
                supprimées et le statut devient inactif. L&apos;historique de
                commandes est conservé à des fins comptables, sans identité
                exploitable.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rgpdAcknowledged}
                onChange={(event) => {
                  setRgpdAcknowledged(event.target.checked)
                }}
              />
              <span>
                J&apos;ai lu l&apos;avertissement RGPD et je confirme le
                caractère sensible de cette action.
              </span>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Saisissez SUPPRIMER pour confirmer</span>
              <input
                type="text"
                value={rgpdConfirmationText}
                onChange={(event) => {
                  setRgpdConfirmationText(event.target.value)
                }}
                className="h-10 w-full rounded-md border border-brand-error/30 px-3"
              />
            </label>

            <Button
              type="button"
              className="bg-brand-error text-white hover:bg-brand-error/90"
              onClick={() => {
                void handleRgpdDelete()
              }}
              disabled={isDeleting}
            >
              <UserX className="size-4" aria-hidden="true" />
              {isDeleting
                ? "Suppression RGPD..."
                : "Supprimer le compte (RGPD)"}
            </Button>

            <p className="text-xs text-slate-500">
              Confirmation renforcée active: case RGPD + saisie explicite +
              validation finale.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
