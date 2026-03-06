export const AUTHENTICATION_STORAGE_KEY = "althea:is_authenticated"
export const CART_COUNT_STORAGE_KEY = "althea:cart_count"

export const AUTHENTICATION_UPDATED_EVENT_NAME = "althea:auth-updated"
export const CART_UPDATED_EVENT_NAME = "althea:cart-updated"

export const MOBILE_MENU_DIALOG_ID = "mobile-main-menu"

export const LINKEDIN_SOCIAL_URL = "https://www.linkedin.com"
export const INSTAGRAM_SOCIAL_URL = "https://www.instagram.com"
export const X_SOCIAL_URL = "https://x.com"

export type LayoutMenuItemKey =
  | "settings"
  | "orders"
  | "terms"
  | "legal"
  | "contact"
  | "about"
  | "signIn"
  | "signUp"

export type LayoutMenuItem = {
  key: LayoutMenuItemKey
  href: string
}

export const AUTHENTICATED_MENU_ITEMS: LayoutMenuItem[] = [
  { key: "settings", href: "/mes-parametres" },
  { key: "orders", href: "/mes-commandes" },
  { key: "terms", href: "/cgu" },
  { key: "legal", href: "/mentions-legales" },
  { key: "contact", href: "/contact" },
  { key: "about", href: "/a-propos" },
]

export const GUEST_MENU_ITEMS: LayoutMenuItem[] = [
  { key: "signIn", href: "/connexion" },
  { key: "signUp", href: "/inscription" },
  { key: "terms", href: "/cgu" },
  { key: "legal", href: "/mentions-legales" },
  { key: "contact", href: "/contact" },
  { key: "about", href: "/a-propos" },
]

export const FOOTER_LINK_ITEMS: LayoutMenuItem[] = [
  { key: "legal", href: "/mentions-legales" },
  { key: "terms", href: "/cgu" },
  { key: "contact", href: "/contact" },
]
