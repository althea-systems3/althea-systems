"use client"

import { AlertCircle, CheckCircle2, RefreshCw, UserCheck } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

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

type ContactMessageStatusFilter = "all" | "pending" | "processed"

type ContactMessage = {
  id_message: string
  email: string
  sujet: string
  contenu: string
  date_envoie: string
  est_traite: boolean
  id_admin_traitement: string | null
}

type ContactMessagesPayload = {
  messages: ContactMessage[]
}

type ContactMessagePatchPayload = {
  message: ContactMessage
}

export function AdminContactMessagesSection() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [statusFilter, setStatusFilter] =
    useState<ContactMessageStatusFilter>("pending")

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [processingMessageId, setProcessingMessageId] = useState<string | null>(
    null,
  )

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const searchParams = new URLSearchParams()

      if (statusFilter !== "all") {
        searchParams.set("status", statusFilter)
      }

      const endpoint = searchParams.toString()
        ? `/api/admin/contact-messages?${searchParams.toString()}`
        : "/api/admin/contact-messages"

      const response = await fetch(endpoint, { cache: "no-store" })

      const payload = await parseApiResponse<ContactMessagesPayload>(
        response,
        "Impossible de charger les messages de contact.",
      )

      setMessages(payload.messages)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les messages de contact.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  const handlePatchMessage = async (
    messageId: string,
    payload: { assignToMe?: boolean; markProcessed?: boolean },
  ) => {
    setProcessingMessageId(messageId)
    setErrorMessage(null)
    setNoticeMessage(null)

    try {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const nextPayload = await parseApiResponse<ContactMessagePatchPayload>(
        response,
        "Impossible de mettre a jour le message.",
      )

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id_message === messageId ? nextPayload.message : message,
        ),
      )

      setNoticeMessage("Message mis a jour avec succes.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour le message.",
      )
    } finally {
      setProcessingMessageId(null)
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-contact-title">
      <header className="space-y-1">
        <h1
          id="admin-contact-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Messages de contact
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Attribuez et traitez les demandes envoyees depuis le formulaire
          contact.
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
          <CardTitle className="text-xl">Filtrage</CardTitle>
          <CardDescription>
            Filtrez les messages selon leur etat de traitement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Statut</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as ContactMessageStatusFilter,
                )
              }
              className="h-10 min-w-40 rounded-md border border-border px-3"
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="processed">Traites</option>
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMessages()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Rafraichir
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Messages</CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des messages..."
              : `${messages.length} message(s) charge(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Sujet</th>
                  <th className="px-2 py-3">Expediteur</th>
                  <th className="px-2 py-3">Date</th>
                  <th className="px-2 py-3">Etat</th>
                  <th className="px-2 py-3">Message</th>
                  <th className="px-2 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && messages.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-slate-500" colSpan={6}>
                      Aucun message a afficher.
                    </td>
                  </tr>
                ) : null}

                {messages.map((message) => (
                  <tr
                    key={message.id_message}
                    className="border-b border-border/60"
                  >
                    <td className="px-2 py-3 align-top">
                      <p className="font-medium text-brand-nav">
                        {message.sujet}
                      </p>
                      <p className="text-xs text-slate-500">
                        {message.id_message}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {message.email}
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {formatDate(message.date_envoie)}
                    </td>
                    <td className="px-2 py-3 align-top">
                      {message.est_traite ? (
                        <Badge className="border-transparent bg-brand-success text-white">
                          Traite
                        </Badge>
                      ) : (
                        <Badge className="border-transparent bg-brand-alert text-white">
                          En attente
                        </Badge>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Admin: {message.id_admin_traitement ?? "-"}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      <p className="line-clamp-3 max-w-[320px]">
                        {message.contenu}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            processingMessageId === message.id_message ||
                            Boolean(message.id_admin_traitement)
                          }
                          onClick={() =>
                            void handlePatchMessage(message.id_message, {
                              assignToMe: true,
                            })
                          }
                        >
                          <UserCheck className="size-3.5" aria-hidden="true" />
                          Assigner
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            processingMessageId === message.id_message ||
                            message.est_traite
                          }
                          onClick={() =>
                            void handlePatchMessage(message.id_message, {
                              markProcessed: true,
                            })
                          }
                        >
                          <CheckCircle2
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          Traiter
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
    </section>
  )
}
