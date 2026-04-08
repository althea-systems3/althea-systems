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
import { cn } from "@/lib/utils"

type ChatbotListStatus = "all" | "pending" | "handled"
type HandoverStatus = "none" | "pending" | "in_progress" | "handled"
type HandoverUpdateStatus = "pending" | "in_progress" | "handled"

type ChatbotConversationSummary = {
  conversationId: string
  userId: string | null
  sessionId: string | null
  collectedEmail: string | null
  collectedSubject: string | null
  handoverStatus: HandoverStatus
  assignedAdminId: string | null
  updatedAt: string | null
  messageCount: number
  lastMessagePreview: string | null
}

type ChatbotConversationsPayload = {
  conversations: ChatbotConversationSummary[]
}

type ChatbotConversationMessage = {
  role?: string
  content?: string
  timestamp?: string
}

type ChatbotConversationDetail = {
  conversationId: string
  userId: string | null
  sessionId: string | null
  collectedEmail: string | null
  collectedSubject: string | null
  handoverStatus: HandoverStatus
  assignedAdminId: string | null
  createdAt: string | null
  updatedAt: string | null
  messages: ChatbotConversationMessage[]
}

type ChatbotConversationDetailPayload = {
  conversation: ChatbotConversationDetail
}

function mapHandoverStatusLabel(status: HandoverStatus): string {
  if (status === "pending") {
    return "En attente"
  }

  if (status === "in_progress") {
    return "En cours"
  }

  if (status === "handled") {
    return "Traite"
  }

  return "Aucune escalation"
}

function mapHandoverStatusClassName(status: HandoverStatus): string {
  if (status === "pending") {
    return "bg-brand-alert text-white"
  }

  if (status === "in_progress") {
    return "bg-brand-cta text-white"
  }

  if (status === "handled") {
    return "bg-brand-success text-white"
  }

  return "bg-slate-200 text-slate-700"
}

export function AdminChatbotSection() {
  const [conversations, setConversations] = useState<
    ChatbotConversationSummary[]
  >([])

  const [statusFilter, setStatusFilter] = useState<ChatbotListStatus>("pending")
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [conversationDetail, setConversationDetail] =
    useState<ChatbotConversationDetailPayload | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const [updatingConversationId, setUpdatingConversationId] = useState<
    string | null
  >(null)

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const searchParams = new URLSearchParams()

      if (statusFilter !== "all") {
        searchParams.set("status", statusFilter)
      }

      if (appliedSearch.trim()) {
        searchParams.set("search", appliedSearch.trim())
      }

      const endpoint = searchParams.toString()
        ? `/api/admin/chatbot?${searchParams.toString()}`
        : "/api/admin/chatbot"

      const response = await fetch(endpoint, { cache: "no-store" })

      const payload = await parseApiResponse<ChatbotConversationsPayload>(
        response,
        "Impossible de charger les conversations chatbot.",
      )

      setConversations(payload.conversations)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les conversations chatbot.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [appliedSearch, statusFilter])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  const handleApplySearch = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    setAppliedSearch(searchInput)
  }

  const handleResetSearch = () => {
    setSearchInput("")
    setAppliedSearch("")
  }

  const handleOpenConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setConversationDetail(null)
    setIsDetailLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/chatbot/${conversationId}`, {
        cache: "no-store",
      })

      const payload = await parseApiResponse<ChatbotConversationDetailPayload>(
        response,
        "Impossible de charger le detail de la conversation.",
      )

      setConversationDetail(payload)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger le detail de la conversation.",
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleUpdateConversationStatus = async (
    conversationId: string,
    status: HandoverUpdateStatus,
  ) => {
    setErrorMessage(null)
    setNoticeMessage(null)
    setUpdatingConversationId(conversationId)

    try {
      const response = await fetch(`/api/admin/chatbot/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      })

      await parseApiResponse<{ conversation: Record<string, unknown> }>(
        response,
        "Impossible de mettre a jour le statut conversation.",
      )

      setConversations((previousConversations) =>
        previousConversations.map((conversation) =>
          conversation.conversationId === conversationId
            ? {
                ...conversation,
                handoverStatus: status,
              }
            : conversation,
        ),
      )

      setConversationDetail((previousDetail) => {
        if (
          !previousDetail ||
          previousDetail.conversation.conversationId !== conversationId
        ) {
          return previousDetail
        }

        return {
          ...previousDetail,
          conversation: {
            ...previousDetail.conversation,
            handoverStatus: status,
            updatedAt: new Date().toISOString(),
          },
        }
      })

      setNoticeMessage("Statut conversation mis a jour.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour le statut conversation.",
      )
    } finally {
      setUpdatingConversationId(null)
    }
  }

  const selectedConversationSummary = useMemo(() => {
    if (!selectedConversationId) {
      return null
    }

    return (
      conversations.find(
        (conversation) =>
          conversation.conversationId === selectedConversationId,
      ) ?? null
    )
  }, [conversations, selectedConversationId])

  return (
    <section className="space-y-6" aria-labelledby="admin-chatbot-title">
      <header className="space-y-1">
        <h1
          id="admin-chatbot-title"
          className="heading-font text-2xl text-brand-nav sm:text-3xl"
        >
          Escalades chatbot
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Suivez les conversations transferees a un humain et gerez leur statut.
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
          <CardTitle className="text-xl">Filtres conversation</CardTitle>
          <CardDescription>
            Filtrez les escalades par statut et par recherche libre.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Statut</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ChatbotListStatus)
                }
                className="h-10 min-w-40 rounded-md border border-border px-3"
              >
                <option value="all">Tous</option>
                <option value="pending">En attente/en cours</option>
                <option value="handled">Traites</option>
              </select>
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => void loadConversations()}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Rafraichir
            </Button>
          </div>

          <form
            className="grid gap-3 md:grid-cols-[1fr_auto_auto]"
            onSubmit={handleApplySearch}
          >
            <label className="space-y-1 text-sm text-slate-700">
              <span>Recherche</span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="email, sujet ou conversation ID"
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
          <CardTitle className="text-xl">Conversations</CardTitle>
          <CardDescription>
            {isLoading
              ? "Chargement des conversations..."
              : `${conversations.length} conversation(s) trouvee(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-3">Conversation</th>
                  <th className="px-2 py-3">Contact</th>
                  <th className="px-2 py-3">Statut</th>
                  <th className="px-2 py-3">Maj</th>
                  <th className="px-2 py-3">Apercu</th>
                  <th className="px-2 py-3">Action statut</th>
                  <th className="px-2 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && conversations.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-slate-500" colSpan={7}>
                      Aucune conversation a afficher.
                    </td>
                  </tr>
                ) : null}

                {conversations.map((conversation) => (
                  <tr
                    key={conversation.conversationId}
                    className="border-b border-border/60"
                  >
                    <td className="px-2 py-3 align-top">
                      <p className="font-medium text-brand-nav">
                        {conversation.conversationId}
                      </p>
                      <p className="text-xs text-slate-500">
                        Messages: {conversation.messageCount}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      <p>{conversation.collectedEmail ?? "-"}</p>
                      <p className="text-xs text-slate-500">
                        {conversation.collectedSubject ?? "Sans sujet"}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <Badge
                        className={cn(
                          "border-transparent",
                          mapHandoverStatusClassName(
                            conversation.handoverStatus,
                          ),
                        )}
                      >
                        {mapHandoverStatusLabel(conversation.handoverStatus)}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-500">
                        Admin: {conversation.assignedAdminId ?? "-"}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      {formatDate(conversation.updatedAt)}
                    </td>
                    <td className="px-2 py-3 align-top text-slate-700">
                      <p className="line-clamp-2 max-w-[240px]">
                        {conversation.lastMessagePreview ?? "-"}
                      </p>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <select
                        aria-label={`Mettre a jour ${conversation.conversationId}`}
                        value={
                          conversation.handoverStatus === "none"
                            ? "pending"
                            : conversation.handoverStatus
                        }
                        disabled={
                          updatingConversationId === conversation.conversationId
                        }
                        onChange={(event) =>
                          void handleUpdateConversationStatus(
                            conversation.conversationId,
                            event.target.value as HandoverUpdateStatus,
                          )
                        }
                        className="h-9 w-full rounded-md border border-border px-2 text-sm"
                      >
                        <option value="pending">En attente</option>
                        <option value="in_progress">En cours</option>
                        <option value="handled">Traite</option>
                      </select>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void handleOpenConversation(
                            conversation.conversationId,
                          )
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

      {selectedConversationId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Detail conversation{" "}
              {selectedConversationSummary?.conversationId ??
                selectedConversationId}
            </CardTitle>
            <CardDescription>
              Historique complet et metadonnees de l escalation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDetailLoading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : null}

            {!isDetailLoading && conversationDetail ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Email collecte</p>
                    <p className="font-medium text-brand-nav">
                      {conversationDetail.conversation.collectedEmail ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Sujet collecte</p>
                    <p className="font-medium text-brand-nav">
                      {conversationDetail.conversation.collectedSubject ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">Statut</p>
                    <p className="font-medium text-brand-nav">
                      {mapHandoverStatusLabel(
                        conversationDetail.conversation.handoverStatus,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <p className="text-xs text-slate-500">
                      Derniere mise a jour
                    </p>
                    <p className="font-medium text-brand-nav">
                      {formatDate(conversationDetail.conversation.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <h3 className="heading-font text-base text-brand-nav">
                    Messages
                  </h3>
                  {conversationDetail.conversation.messages.length > 0 ? (
                    <ul className="space-y-2">
                      {conversationDetail.conversation.messages.map(
                        (message, index) => (
                          <li
                            key={`${selectedConversationId}-message-${index}`}
                            className="rounded-md border border-border/70 bg-slate-50 p-3 text-sm"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                              <span>{message.role ?? "unknown"}</span>
                              <span>{formatDate(message.timestamp)}</span>
                            </div>
                            <p className="text-slate-700">
                              {message.content ?? ""}
                            </p>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Aucun message disponible.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {!isDetailLoading && !conversationDetail ? (
              <p className="text-sm text-slate-600">Aucun detail a afficher.</p>
            ) : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedConversationId(null)
                  setConversationDetail(null)
                }}
              >
                Fermer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadConversations()}
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
