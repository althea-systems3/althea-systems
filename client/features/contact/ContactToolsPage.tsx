"use client"

import { Loader2, MessageCircleMore, Send, UserRound } from "lucide-react"
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
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
  type ContactFieldName,
  getInitialContactFormValues,
  hasContactFormErrors,
  type ContactFormValues,
  validateContactForm,
} from "@/lib/contact/validation"
import { sanitizeChatContent } from "@/lib/contact/chatbot"
import {
  getContactToolsLocaleContent,
  type ContactToolsLocaleContent,
} from "@/features/contact/contactContent"

type ContactToolsPageProps = {
  locale: string
  title: string
  description: string
  initialChatOpen?: boolean
}

type FormStatus = {
  isError: boolean
  message: string
} | null

type ChatRole = "user" | "bot"

type ChatActionType = "contact_form" | "escalate_human"

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  actions: ChatActionType[]
}

type SessionMode = "loading" | "authenticated" | "guest"

type ChatbotApiResponse = {
  conversationId: string
  reply: string
  captured: {
    email: string | null
    subject: string | null
  }
  escalationRecommended: boolean
  actions: ChatActionType[]
}

function createClientMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function getValidationMessage(
  content: ContactToolsLocaleContent,
  fieldName: ContactFieldName,
  errorCode: "required" | "invalid" | "too_long",
): string {
  if (fieldName === "email" && errorCode === "required") {
    return content.validation.emailRequired
  }

  if (fieldName === "email" && errorCode === "invalid") {
    return content.validation.emailInvalid
  }

  if (fieldName === "subject" && errorCode === "required") {
    return content.validation.subjectRequired
  }

  if (fieldName === "subject" && errorCode === "too_long") {
    return content.validation.subjectTooLong
  }

  if (fieldName === "message" && errorCode === "required") {
    return content.validation.messageRequired
  }

  return content.validation.messageTooLong
}

function getSessionBadgeLabel(
  content: ContactToolsLocaleContent,
  sessionMode: SessionMode,
): string {
  if (sessionMode === "authenticated") {
    return content.chat.sessionAuthenticated
  }

  if (sessionMode === "guest") {
    return content.chat.sessionGuest
  }

  return content.chat.sessionLoading
}

export function ContactToolsPage({
  locale,
  title,
  description,
  initialChatOpen = false,
}: ContactToolsPageProps) {
  const content = getContactToolsLocaleContent(locale)

  const [formValues, setFormValues] = useState<ContactFormValues>(() =>
    getInitialContactFormValues(),
  )
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<ContactFieldName, boolean>>
  >({})
  const [hasSubmitAttempted, setHasSubmitAttempted] = useState(false)
  const [isFormSubmitting, setIsFormSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState<FormStatus>(null)

  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: createClientMessageId("bot"),
      role: "bot",
      content: content.chat.welcome,
      actions: [],
    },
    {
      id: createClientMessageId("bot"),
      role: "bot",
      content: content.chat.askEmail,
      actions: [],
    },
  ])
  const [chatConversationId, setChatConversationId] = useState<string | null>(
    null,
  )
  const [isBotReplying, setIsBotReplying] = useState(false)
  const [isEscalating, setIsEscalating] = useState(false)
  const [isEscalated, setIsEscalated] = useState(false)
  const [chatStatus, setChatStatus] = useState<FormStatus>(null)
  const [chatCapturedEmail, setChatCapturedEmail] = useState("")
  const [chatCapturedSubject, setChatCapturedSubject] = useState("")
  const [sessionMode, setSessionMode] = useState<SessionMode>("loading")

  const chatLogRef = useRef<HTMLOListElement | null>(null)
  const formSectionRef = useRef<HTMLDivElement | null>(null)

  const formErrors = useMemo(() => {
    return validateContactForm(formValues)
  }, [formValues])

  const hasFormErrors = hasContactFormErrors(formErrors)

  useEffect(() => {
    let isCancelled = false

    async function hydrateSession() {
      try {
        const response = await fetch("/api/auth/me", { method: "GET" })
        const payload = await response.json().catch(() => null)

        if (isCancelled) {
          return
        }

        const isAuthenticated = payload?.isAuthenticated === true

        if (isAuthenticated) {
          setSessionMode("authenticated")

          const userEmail =
            typeof payload?.user?.email === "string" ? payload.user.email : ""

          if (userEmail) {
            setFormValues((currentValues) => ({
              ...currentValues,
              email: currentValues.email || userEmail,
            }))
            setChatCapturedEmail((currentEmail) => currentEmail || userEmail)
          }
          return
        }

        setSessionMode("guest")
      } catch {
        if (!isCancelled) {
          setSessionMode("guest")
        }
      }
    }

    hydrateSession()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!chatLogRef.current) {
      return
    }

    const chatLogElement = chatLogRef.current
    chatLogElement.scrollTop = chatLogElement.scrollHeight
  }, [chatMessages, isBotReplying])

  function updateFormField(fieldName: ContactFieldName, value: string) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))

    setTouchedFields((currentValues) => ({
      ...currentValues,
      [fieldName]: true,
    }))

    if (formStatus?.isError) {
      setFormStatus(null)
    }
  }

  function getFieldErrorMessage(fieldName: ContactFieldName): string | null {
    const shouldShowError =
      hasSubmitAttempted || Boolean(touchedFields[fieldName])

    if (!shouldShowError) {
      return null
    }

    const fieldErrorCode = formErrors[fieldName]

    if (!fieldErrorCode) {
      return null
    }

    return getValidationMessage(content, fieldName, fieldErrorCode)
  }

  function getFieldErrorId(fieldName: ContactFieldName): string {
    return `contact-field-${fieldName}-error`
  }

  function getFieldDescribedBy(
    fieldName: ContactFieldName,
  ): string | undefined {
    const fieldErrorMessage = getFieldErrorMessage(fieldName)

    if (!fieldErrorMessage) {
      return undefined
    }

    return getFieldErrorId(fieldName)
  }

  async function handleContactFormSubmit(
    formSubmitEvent: FormEvent<HTMLFormElement>,
  ) {
    formSubmitEvent.preventDefault()

    setHasSubmitAttempted(true)
    setTouchedFields({
      email: true,
      subject: true,
      message: true,
    })

    if (hasFormErrors) {
      setFormStatus({
        isError: true,
        message: content.formErrorHint,
      })
      return
    }

    setIsFormSubmitting(true)
    setFormStatus(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formValues.email,
          subject: formValues.subject,
          message: formValues.message,
        }),
      })

      if (!response.ok) {
        setFormStatus({
          isError: true,
          message: content.formErrorMessage,
        })
        return
      }

      setFormStatus({
        isError: false,
        message: content.formSuccessMessage,
      })
      setFormValues((currentValues) => ({
        email: currentValues.email,
        subject: "",
        message: "",
      }))
      setTouchedFields({})
      setHasSubmitAttempted(false)
    } catch {
      setFormStatus({
        isError: true,
        message: content.formErrorMessage,
      })
    } finally {
      setIsFormSubmitting(false)
    }
  }

  function addChatMessage(
    role: ChatRole,
    message: string,
    actions: ChatActionType[] = [],
  ) {
    setChatMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createClientMessageId(role),
        role,
        content: message,
        actions,
      },
    ])
  }

  async function handleSendChatMessage(formSubmitEvent: FormEvent) {
    formSubmitEvent.preventDefault()

    if (!chatInput.trim() || isBotReplying) {
      return
    }

    const safeMessage = sanitizeChatContent(chatInput)

    if (!safeMessage) {
      return
    }

    setChatInput("")
    setChatStatus(null)
    addChatMessage("user", safeMessage)
    setIsBotReplying(true)

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: chatConversationId,
          message: safeMessage,
          collectedEmail: chatCapturedEmail || formValues.email,
          collectedSubject: chatCapturedSubject || formValues.subject,
        }),
      })

      const payload = (await response
        .json()
        .catch(() => null)) as ChatbotApiResponse | null

      if (!response.ok || !payload) {
        addChatMessage("bot", content.chat.networkError, ["contact_form"])
        return
      }

      setChatConversationId(payload.conversationId)

      if (payload.captured.email) {
        setChatCapturedEmail(payload.captured.email)
        setFormValues((currentValues) => ({
          ...currentValues,
          email: currentValues.email || payload.captured.email || "",
        }))
      }

      if (payload.captured.subject) {
        setChatCapturedSubject(payload.captured.subject)
        setFormValues((currentValues) => ({
          ...currentValues,
          subject: currentValues.subject || payload.captured.subject || "",
        }))
      }

      addChatMessage("bot", payload.reply, payload.actions)

      if (payload.escalationRecommended && !isEscalated) {
        setChatStatus({
          isError: false,
          message: content.chat.contactFormCta,
        })
      }
    } catch {
      addChatMessage("bot", content.chat.networkError, ["contact_form"])
    } finally {
      setIsBotReplying(false)
    }
  }

  function focusContactFormFromChat() {
    setIsChatOpen(false)

    if (chatCapturedEmail) {
      setFormValues((currentValues) => ({
        ...currentValues,
        email: currentValues.email || chatCapturedEmail,
      }))
    }

    if (chatCapturedSubject) {
      setFormValues((currentValues) => ({
        ...currentValues,
        subject: currentValues.subject || chatCapturedSubject,
      }))
    }

    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  async function handleEscalateToHuman() {
    if (isEscalating || isEscalated) {
      return
    }

    if (!chatConversationId) {
      setChatStatus({
        isError: true,
        message: content.chat.askSubject,
      })
      return
    }

    setIsEscalating(true)
    setChatStatus(null)

    try {
      const response = await fetch("/api/chatbot/escalate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: chatConversationId,
          email: chatCapturedEmail || formValues.email,
          subject: chatCapturedSubject || formValues.subject,
          transcript: chatMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      if (!response.ok) {
        setChatStatus({
          isError: true,
          message: content.chat.escalationError,
        })
        return
      }

      setIsEscalated(true)
      setChatStatus({
        isError: false,
        message: content.chat.escalationSuccess,
      })
      addChatMessage("bot", content.chat.escalationSuccess, ["contact_form"])
    } catch {
      setChatStatus({
        isError: true,
        message: content.chat.escalationError,
      })
    } finally {
      setIsEscalating(false)
    }
  }

  const formSubmitLabel = isFormSubmitting
    ? content.formSubmittingLabel
    : content.formSubmitLabel

  const chatSendLabel = isBotReplying
    ? content.chat.sendingLabel
    : content.chat.sendLabel

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-6xl gap-6 sm:gap-8">
        <header className="rounded-2xl border border-border/80 bg-[linear-gradient(130deg,#d5f6f8_0%,#eef8fb_55%,#ffffff_100%)] p-5 sm:p-7">
          <Badge className="w-fit bg-brand-cta text-white hover:bg-[#0095a0]">
            {content.badge}
          </Badge>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-nav sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
            {description}
          </p>

          <p className="mt-3 text-sm font-medium text-brand-nav">
            {content.responseTime}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              className="bg-brand-cta text-white hover:bg-[#0095a0]"
              onClick={() => setIsChatOpen(true)}
              aria-label={content.chat.openLabel}
            >
              <MessageCircleMore className="size-4" aria-hidden="true" />
              {content.contactMeLabel}
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card
            ref={formSectionRef}
            id="contact-form"
            className="border-border/70 shadow-sm"
          >
            <CardHeader>
              <CardTitle className="text-xl text-brand-nav">
                {content.formTitle}
              </CardTitle>
              <CardDescription>{content.formDescription}</CardDescription>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleContactFormSubmit}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-email"
                    className="text-sm font-medium text-brand-nav"
                  >
                    {content.formEmailLabel}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={formValues.email}
                    onChange={(changeEvent) =>
                      updateFormField("email", changeEvent.target.value)
                    }
                    placeholder={content.formEmailPlaceholder}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                    aria-invalid={Boolean(getFieldErrorMessage("email"))}
                    aria-describedby={getFieldDescribedBy("email")}
                    autoComplete="email"
                  />
                  {getFieldErrorMessage("email") ? (
                    <p
                      id={getFieldErrorId("email")}
                      className="text-xs text-brand-error"
                      role="alert"
                    >
                      {getFieldErrorMessage("email")}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="text-sm font-medium text-brand-nav"
                  >
                    {content.formSubjectLabel}
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={formValues.subject}
                    onChange={(changeEvent) =>
                      updateFormField("subject", changeEvent.target.value)
                    }
                    placeholder={content.formSubjectPlaceholder}
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                    aria-invalid={Boolean(getFieldErrorMessage("subject"))}
                    aria-describedby={getFieldDescribedBy("subject")}
                  />
                  {getFieldErrorMessage("subject") ? (
                    <p
                      id={getFieldErrorId("subject")}
                      className="text-xs text-brand-error"
                      role="alert"
                    >
                      {getFieldErrorMessage("subject")}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="text-sm font-medium text-brand-nav"
                  >
                    {content.formMessageLabel}
                  </label>
                  <textarea
                    id="contact-message"
                    value={formValues.message}
                    onChange={(changeEvent) =>
                      updateFormField("message", changeEvent.target.value)
                    }
                    placeholder={content.formMessagePlaceholder}
                    rows={6}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                    aria-invalid={Boolean(getFieldErrorMessage("message"))}
                    aria-describedby={getFieldDescribedBy("message")}
                  />
                  {getFieldErrorMessage("message") ? (
                    <p
                      id={getFieldErrorId("message")}
                      className="text-xs text-brand-error"
                      role="alert"
                    >
                      {getFieldErrorMessage("message")}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    className="bg-brand-cta text-white hover:bg-[#0095a0]"
                    disabled={isFormSubmitting}
                  >
                    {isFormSubmitting ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : null}
                    {formSubmitLabel}
                  </Button>
                </div>

                {formStatus ? (
                  <p
                    className={
                      formStatus.isError
                        ? "text-sm text-brand-error"
                        : "text-sm text-brand-success"
                    }
                    role={formStatus.isError ? "alert" : "status"}
                    aria-live="polite"
                  >
                    {formStatus.message}
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-brand-nav">
                {content.sectionTitle}
              </CardTitle>
              <CardDescription>{content.sectionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium text-brand-nav">
                {content.supportTopicsTitle}
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                {content.supportTopics.map((topic) => (
                  <li key={topic} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-cta"
                    />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Button
          type="button"
          onClick={() => setIsChatOpen((currentValue) => !currentValue)}
          className="fixed bottom-4 end-4 z-40 h-12 rounded-full bg-brand-cta px-4 text-white shadow-lg hover:bg-[#0095a0] sm:bottom-6 sm:end-6"
          aria-expanded={isChatOpen}
          aria-controls="contact-chat-widget"
          aria-label={
            isChatOpen ? content.chat.closeLabel : content.chat.openLabel
          }
        >
          <MessageCircleMore className="me-1 size-4" aria-hidden="true" />
          {content.contactMeLabel}
        </Button>

        {isChatOpen ? (
          <aside
            id="contact-chat-widget"
            className="fixed bottom-20 end-2 z-50 w-[calc(100vw-1rem)] max-w-md rounded-2xl border border-border bg-white shadow-2xl sm:bottom-24 sm:end-6"
            role="dialog"
            aria-label={content.chat.title}
          >
            <header className="flex items-center justify-between rounded-t-2xl border-b border-border bg-brand-nav px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{content.chat.title}</p>
                <p className="truncate text-xs text-slate-200">
                  {getSessionBadgeLabel(content, sessionMode)}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setIsChatOpen(false)}
                aria-label={content.chat.closeLabel}
              >
                {content.chat.closeLabel}
              </Button>
            </header>

            <div className="space-y-3 p-3">
              <p className="text-xs text-slate-500">
                {content.chat.description}
              </p>

              <div className="rounded-lg border border-border bg-slate-50">
                <p className="border-b border-border px-3 py-2 text-xs font-medium text-brand-nav">
                  {content.chat.transcriptTitle}
                </p>

                <ol
                  ref={chatLogRef}
                  className="max-h-72 space-y-2 overflow-y-auto px-3 py-3"
                  role="log"
                  aria-live="polite"
                >
                  {chatMessages.map((message) => {
                    const isUserMessage = message.role === "user"

                    return (
                      <li
                        key={message.id}
                        className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                            isUserMessage
                              ? "bg-brand-cta text-white"
                              : "border border-border bg-white text-slate-700"
                          }`}
                        >
                          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                            {isUserMessage ? (
                              <UserRound
                                className="size-3"
                                aria-hidden="true"
                              />
                            ) : (
                              <MessageCircleMore
                                className="size-3"
                                aria-hidden="true"
                              />
                            )}
                            {isUserMessage
                              ? content.chat.userLabel
                              : content.chat.botLabel}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap">
                            {message.content}
                          </p>

                          {message.actions.includes("contact_form") ? (
                            <button
                              type="button"
                              className="mt-2 rounded-md bg-brand-cta px-2.5 py-1 text-xs font-medium text-white hover:bg-[#0095a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                              onClick={focusContactFormFromChat}
                            >
                              {content.chat.contactFormCta}
                            </button>
                          ) : null}

                          {message.actions.includes("escalate_human") &&
                          !isEscalated ? (
                            <button
                              type="button"
                              className="mt-2 rounded-md border border-brand-alert px-2.5 py-1 text-xs font-medium text-brand-nav hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                              onClick={handleEscalateToHuman}
                              disabled={isEscalating}
                            >
                              {isEscalating
                                ? content.chat.escalatingLabel
                                : content.chat.escalateLabel}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}

                  {isBotReplying ? (
                    <li className="flex justify-start">
                      <div className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-600">
                        <p>{content.chat.botTyping}</p>
                      </div>
                    </li>
                  ) : null}
                </ol>
              </div>

              <form onSubmit={handleSendChatMessage} className="space-y-2">
                <label htmlFor="contact-chat-input" className="sr-only">
                  {content.chat.inputLabel}
                </label>

                <div className="flex items-center gap-2">
                  <input
                    id="contact-chat-input"
                    type="text"
                    value={chatInput}
                    onChange={(changeEvent) =>
                      setChatInput(changeEvent.target.value)
                    }
                    placeholder={content.chat.inputPlaceholder}
                    className="h-10 flex-1 rounded-md border border-border bg-white px-3 text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                    disabled={isBotReplying}
                  />

                  <Button
                    type="submit"
                    className="h-10 bg-brand-cta px-3 text-white hover:bg-[#0095a0]"
                    disabled={isBotReplying || !chatInput.trim()}
                  >
                    {isBotReplying ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send className="size-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">{chatSendLabel}</span>
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEscalateToHuman}
                  disabled={isEscalating || isEscalated}
                  className="text-xs"
                >
                  {isEscalating
                    ? content.chat.escalatingLabel
                    : content.chat.escalateLabel}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={focusContactFormFromChat}
                  className="text-xs"
                >
                  {content.chat.contactFormCta}
                </Button>
              </div>

              {chatStatus ? (
                <p
                  className={
                    chatStatus.isError
                      ? "text-xs text-brand-error"
                      : "text-xs text-brand-success"
                  }
                  role={chatStatus.isError ? "alert" : "status"}
                  aria-live="polite"
                >
                  {chatStatus.message}
                </p>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  )
}
