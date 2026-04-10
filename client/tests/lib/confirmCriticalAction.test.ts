import { afterEach, describe, expect, it } from "vitest"

import { confirmCriticalAction } from "@/lib/ui/confirmCriticalAction"

describe("confirmCriticalAction", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    document.body.className = ""
  })

  it("returns true when confirmation button is clicked", async () => {
    const confirmationPromise = confirmCriticalAction({
      message: "Supprimer cette ressource ?",
    })

    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Confirmer",
    )

    expect(confirmButton).toBeTruthy()
    ;(confirmButton as HTMLButtonElement).click()

    await expect(confirmationPromise).resolves.toBe(true)
    expect(document.body.classList.contains("overflow-hidden")).toBe(false)
  })

  it("returns false when escape is pressed", async () => {
    const confirmationPromise = confirmCriticalAction({
      message: "Valider l'action ?",
    })

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

    await expect(confirmationPromise).resolves.toBe(false)
    expect(document.body.classList.contains("overflow-hidden")).toBe(false)
  })
})
