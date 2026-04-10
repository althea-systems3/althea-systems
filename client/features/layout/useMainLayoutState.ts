import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react"
import {
  AUTHENTICATED_MENU_ITEMS,
  AUTHENTICATION_STORAGE_KEY,
  AUTHENTICATION_UPDATED_EVENT_NAME,
  CART_COUNT_STORAGE_KEY,
  CART_UPDATED_EVENT_NAME,
  GUEST_MENU_ITEMS,
  type LayoutMenuItem,
} from "./layoutConstants"
import { secureFetch } from "@/lib/http/secureFetch"

type MainLayoutState = {
  cartItemCount: number
  isMobileMenuOpen: boolean
  isUserAuthenticated: boolean
  menuPanelRef: MutableRefObject<HTMLElement | null>
  menuToggleButtonRef: MutableRefObject<HTMLButtonElement | null>
  menuItems: LayoutMenuItem[]
  handleCloseMobileMenu: () => void
  handleLogoutUser: () => Promise<void>
  handleToggleMobileMenu: () => void
}

function canUseBrowserApi(): boolean {
  return typeof window !== "undefined"
}

function readBooleanStorageValue(storageKey: string): boolean {
  if (!canUseBrowserApi()) {
    return false
  }

  return window.localStorage.getItem(storageKey) === "true"
}

function readPositiveIntegerStorageValue(storageKey: string): number {
  if (!canUseBrowserApi()) {
    return 0
  }

  const parsedValue = Number(window.localStorage.getItem(storageKey) ?? "0")

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue
  }

  return 0
}

function getFocusableElements(containerElement: HTMLElement): HTMLElement[] {
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",")

  return Array.from(
    containerElement.querySelectorAll<HTMLElement>(focusableSelector),
  )
}

function trapMenuFocus(
  keyboardEvent: KeyboardEvent,
  containerElement: HTMLElement,
): void {
  if (keyboardEvent.key !== "Tab") {
    return
  }

  const focusableElements = getFocusableElements(containerElement)

  if (focusableElements.length === 0) {
    return
  }

  const firstFocusableElement = focusableElements[0]
  const lastFocusableElement = focusableElements[focusableElements.length - 1]
  const activeElement = document.activeElement as HTMLElement | null

  if (keyboardEvent.shiftKey && activeElement === firstFocusableElement) {
    keyboardEvent.preventDefault()
    lastFocusableElement.focus()
    return
  }

  if (!keyboardEvent.shiftKey && activeElement === lastFocusableElement) {
    keyboardEvent.preventDefault()
    firstFocusableElement.focus()
  }
}

export function useMainLayoutState(): MainLayoutState {
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(() => {
    return readBooleanStorageValue(AUTHENTICATION_STORAGE_KEY)
  })
  const [cartItemCount, setCartItemCount] = useState(() => {
    return readPositiveIntegerStorageValue(CART_COUNT_STORAGE_KEY)
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null)
  const menuPanelRef = useRef<HTMLElement | null>(null)

  const menuItems = useMemo(() => {
    return isUserAuthenticated ? AUTHENTICATED_MENU_ITEMS : GUEST_MENU_ITEMS
  }, [isUserAuthenticated])

  const handleSynchronizeUserState = useCallback(() => {
    setIsUserAuthenticated(readBooleanStorageValue(AUTHENTICATION_STORAGE_KEY))
    setCartItemCount(readPositiveIntegerStorageValue(CART_COUNT_STORAGE_KEY))
  }, [])

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((currentValue) => !currentValue)
  }, [])

  const handleLogoutUser = useCallback(async () => {
    try {
      await secureFetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Erreur logout utilisateur", { error })
    }

    if (canUseBrowserApi()) {
      window.localStorage.setItem(AUTHENTICATION_STORAGE_KEY, "false")
      window.localStorage.removeItem(CART_COUNT_STORAGE_KEY)
      window.dispatchEvent(new Event(AUTHENTICATION_UPDATED_EVENT_NAME))
      window.dispatchEvent(new Event(CART_UPDATED_EVENT_NAME))
    }

    setCartItemCount(0)
    setIsUserAuthenticated(false)
    setIsMobileMenuOpen(false)
  }, [])

  useEffect(() => {
    window.addEventListener("storage", handleSynchronizeUserState)
    window.addEventListener(
      AUTHENTICATION_UPDATED_EVENT_NAME,
      handleSynchronizeUserState,
    )
    window.addEventListener(CART_UPDATED_EVENT_NAME, handleSynchronizeUserState)

    return () => {
      window.removeEventListener("storage", handleSynchronizeUserState)
      window.removeEventListener(
        AUTHENTICATION_UPDATED_EVENT_NAME,
        handleSynchronizeUserState,
      )
      window.removeEventListener(
        CART_UPDATED_EVENT_NAME,
        handleSynchronizeUserState,
      )
    }
  }, [handleSynchronizeUserState])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return
    }

    const activeElementBeforeOpen = document.activeElement as HTMLElement | null
    const containerElement = menuPanelRef.current

    if (containerElement) {
      const focusableElements = getFocusableElements(containerElement)
      focusableElements[0]?.focus()
    }

    const handleKeyboardNavigation = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault()
        handleCloseMobileMenu()
        menuToggleButtonRef.current?.focus()
        return
      }

      if (containerElement) {
        trapMenuFocus(keyboardEvent, containerElement)
      }
    }

    document.body.classList.add("overflow-hidden")
    window.addEventListener("keydown", handleKeyboardNavigation)

    return () => {
      document.body.classList.remove("overflow-hidden")
      window.removeEventListener("keydown", handleKeyboardNavigation)

      if (activeElementBeforeOpen) {
        activeElementBeforeOpen.focus()
      }
    }
  }, [handleCloseMobileMenu, isMobileMenuOpen])

  return {
    cartItemCount,
    isMobileMenuOpen,
    isUserAuthenticated,
    menuPanelRef,
    menuToggleButtonRef,
    menuItems,
    handleCloseMobileMenu,
    handleLogoutUser,
    handleToggleMobileMenu,
  }
}
