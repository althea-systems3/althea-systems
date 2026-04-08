import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AdminShell } from "@/features/admin/AdminShell"
import { getCurrentUser } from "@/lib/auth/session"

type AdminRouteLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

function resolveAdminName(currentUser: {
  user: { email?: string | null }
  userProfile: { nom_complet?: string | null } | null
}): string {
  const profileName =
    typeof currentUser.userProfile?.nom_complet === "string"
      ? currentUser.userProfile.nom_complet.trim()
      : ""

  if (profileName) {
    return profileName
  }

  const fallbackEmail =
    typeof currentUser.user.email === "string"
      ? currentUser.user.email.trim()
      : ""

  return fallbackEmail || "Administrateur"
}

export default async function AdminRouteLayout({
  children,
  params,
}: AdminRouteLayoutProps) {
  const { locale } = await params
  const currentUser = await getCurrentUser()

  if (!currentUser?.user) {
    redirect(`/${locale}/connexion?reason=session_expired&next=/admin`)
  }

  if (currentUser.userProfile?.est_admin !== true) {
    redirect(`/${locale}`)
  }

  return (
    <AdminShell adminName={resolveAdminName(currentUser)} locale={locale}>
      {children}
    </AdminShell>
  )
}
