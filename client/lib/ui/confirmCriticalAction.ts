type ConfirmCriticalActionOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "danger" | "warning" | "default"
}

let openedDialogs = 0

function getConfirmButtonClassName(
  tone: ConfirmCriticalActionOptions["tone"],
): string {
  if (tone === "warning") {
    return "inline-flex h-10 items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700"
  }

  if (tone === "default") {
    return "inline-flex h-10 items-center justify-center rounded-md bg-brand-nav px-4 text-sm font-medium text-white transition hover:opacity-90"
  }

  return "inline-flex h-10 items-center justify-center rounded-md bg-brand-error px-4 text-sm font-medium text-white transition hover:opacity-90"
}

function trapFocusWithinDialog(
  keyboardEvent: KeyboardEvent,
  dialog: HTMLElement,
) {
  if (keyboardEvent.key !== "Tab") {
    return
  }

  const focusableElements = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ),
  )

  if (focusableElements.length === 0) {
    return
  }

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  const activeElement = document.activeElement as HTMLElement | null

  if (keyboardEvent.shiftKey && activeElement === firstElement) {
    keyboardEvent.preventDefault()
    lastElement.focus()
    return
  }

  if (!keyboardEvent.shiftKey && activeElement === lastElement) {
    keyboardEvent.preventDefault()
    firstElement.focus()
  }
}

export function confirmCriticalAction(
  options: ConfirmCriticalActionOptions,
): Promise<boolean> {
  if (typeof document === "undefined") {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const {
      title = "Confirmer l'action",
      message,
      confirmLabel = "Confirmer",
      cancelLabel = "Annuler",
      tone = "danger",
    } = options

    const previousFocusedElement = document.activeElement as HTMLElement | null
    const overlay = document.createElement("div")
    const dialog = document.createElement("div")
    const titleElement = document.createElement("h2")
    const messageElement = document.createElement("p")
    const actionsContainer = document.createElement("div")
    const cancelButton = document.createElement("button")
    const confirmButton = document.createElement("button")
    const titleId = `confirm-dialog-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    overlay.className =
      "fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4"
    overlay.setAttribute("role", "presentation")

    dialog.className =
      "w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-2xl"
    dialog.setAttribute("role", "alertdialog")
    dialog.setAttribute("aria-modal", "true")
    dialog.setAttribute("aria-labelledby", titleId)

    titleElement.id = titleId
    titleElement.className = "heading-font text-lg text-brand-nav"
    titleElement.textContent = title

    messageElement.className = "mt-2 text-sm text-slate-700"
    messageElement.textContent = message

    actionsContainer.className = "mt-5 flex justify-end gap-2"

    cancelButton.type = "button"
    cancelButton.className =
      "inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    cancelButton.textContent = cancelLabel

    confirmButton.type = "button"
    confirmButton.className = getConfirmButtonClassName(tone)
    confirmButton.textContent = confirmLabel

    actionsContainer.append(cancelButton, confirmButton)
    dialog.append(titleElement, messageElement, actionsContainer)
    overlay.append(dialog)

    const finish = (result: boolean) => {
      document.removeEventListener("keydown", handleKeyboard, true)
      overlay.remove()

      openedDialogs = Math.max(0, openedDialogs - 1)

      if (openedDialogs === 0) {
        document.body.classList.remove("overflow-hidden")
      }

      if (previousFocusedElement) {
        previousFocusedElement.focus()
      }

      resolve(result)
    }

    const handleKeyboard = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault()
        finish(false)
        return
      }

      trapFocusWithinDialog(keyboardEvent, dialog)
    }

    overlay.addEventListener("click", (mouseEvent) => {
      if (mouseEvent.target === overlay) {
        finish(false)
      }
    })

    cancelButton.addEventListener("click", () => finish(false))
    confirmButton.addEventListener("click", () => finish(true))

    document.addEventListener("keydown", handleKeyboard, true)
    document.body.appendChild(overlay)

    openedDialogs += 1
    document.body.classList.add("overflow-hidden")
    confirmButton.focus()
  })
}
