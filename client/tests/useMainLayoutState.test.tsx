import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  AUTHENTICATION_STORAGE_KEY,
  AUTHENTICATION_UPDATED_EVENT_NAME,
  CART_COUNT_STORAGE_KEY,
  CART_UPDATED_EVENT_NAME,
} from "../features/layout/layoutConstants"
import { useMainLayoutState } from "../features/layout/useMainLayoutState"

describe("useMainLayoutState", () => {
  it("loads authentication and cart state from storage and sync events", async () => {
    // Arrange
    window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "true")
    window.localStorage.setItem(CART_COUNT_STORAGE_KEY, "3")

    const { result } = renderHook(() => useMainLayoutState())

    // Act
    await waitFor(() => {
      expect(result.current.isUserAuthenticated).toBe(true)
      expect(result.current.cartItemCount).toBe(3)
    })

    act(() => {
      window.localStorage.setItem(CART_COUNT_STORAGE_KEY, "8")
      window.dispatchEvent(new Event(CART_UPDATED_EVENT_NAME))
    })

    // Assert
    await waitFor(() => {
      expect(result.current.cartItemCount).toBe(8)
    })
  })

  it("toggles and closes mobile menu state", () => {
    // Arrange
    const { result } = renderHook(() => useMainLayoutState())

    // Act
    act(() => {
      result.current.handleToggleMobileMenu()
    })

    // Assert
    expect(result.current.isMobileMenuOpen).toBe(true)

    // Act
    act(() => {
      result.current.handleCloseMobileMenu()
    })

    // Assert
    expect(result.current.isMobileMenuOpen).toBe(false)
  })

  it("logs out the user and resets auth state", async () => {
    // Arrange
    window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "true")
    const { result } = renderHook(() => useMainLayoutState())

    await waitFor(() => {
      expect(result.current.isUserAuthenticated).toBe(true)
    })

    act(() => {
      result.current.handleToggleMobileMenu()
    })

    // Act
    act(() => {
      result.current.handleLogoutUser()
    })

    // Assert
    expect(window.localStorage.getItem(AUTHENTICATION_STORAGE_KEY)).toBe(
      "false",
    )
    expect(result.current.isUserAuthenticated).toBe(false)
    expect(result.current.isMobileMenuOpen).toBe(false)
  })

  it("closes the mobile menu when Escape is pressed", () => {
    // Arrange
    const { result } = renderHook(() => useMainLayoutState())
    const menuContainerElement = document.createElement("aside")
    const closeButtonElement = document.createElement("button")

    menuContainerElement.appendChild(closeButtonElement)
    document.body.appendChild(menuContainerElement)

    act(() => {
      result.current.menuPanelRef.current = menuContainerElement
      result.current.handleToggleMobileMenu()
    })

    // Act
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    // Assert
    expect(result.current.isMobileMenuOpen).toBe(false)

    document.body.removeChild(menuContainerElement)
  })

  it("synchronizes authentication when auth event is dispatched", async () => {
    // Arrange
    window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "false")
    const { result } = renderHook(() => useMainLayoutState())

    await waitFor(() => {
      expect(result.current.isUserAuthenticated).toBe(false)
    })

    // Act
    act(() => {
      window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "true")
      window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
    })

    // Assert
    await waitFor(() => {
      expect(result.current.isUserAuthenticated).toBe(true)
    })
  })
})
