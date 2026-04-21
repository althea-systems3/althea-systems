import {
  BookText,
  BarChart3,
  Bot,
  Boxes,
  FileText,
  FolderTree,
  ClipboardList,
  Images,
  Mail,
  Users,
  type LucideIcon,
} from "lucide-react"

export type AdminNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: BarChart3,
  },
  {
    label: "Produits",
    href: "/admin/produits",
    icon: Boxes,
  },
  {
    label: "Catégories",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    label: "Carrousel",
    href: "/admin/carousel",
    icon: Images,
  },
  {
    label: "Commandes",
    href: "/admin/commandes",
    icon: ClipboardList,
  },
  {
    label: "Factures",
    href: "/admin/factures",
    icon: ClipboardList,
  },
  {
    label: "Avoirs",
    href: "/admin/avoirs",
    icon: ClipboardList,
  },
  {
    label: "Utilisateurs",
    href: "/admin/utilisateurs",
    icon: Users,
  },
  {
    label: "Messages contact",
    href: "/admin/contact",
    icon: Mail,
  },
  {
    label: "Chatbot",
    href: "/admin/chatbot",
    icon: Bot,
  },
  {
    label: "Pages statiques",
    href: "/admin/pages-statiques",
    icon: BookText,
  },
  {
    label: "Contenu editorial",
    href: "/admin/contenu-editorial",
    icon: FileText,
  },
]
