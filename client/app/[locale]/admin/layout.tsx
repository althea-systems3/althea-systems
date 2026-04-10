import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { AdminShell } from "@/features/admin/AdminShell"
import { isAdminTwoFactorVerified } from "@/lib/auth/adminTwoFactor"
import { ADMIN_2FA_VERIFIED_COOKIE_NAME } from "@/lib/auth/constants"
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

  const cookieStore = await cookies()
  const adminTwoFactorToken =
    cookieStore.get(ADMIN_2FA_VERIFIED_COOKIE_NAME)?.value ?? null
  const isAdminStepUpValid = isAdminTwoFactorVerified(
    adminTwoFactorToken,
    currentUser.user.id,
  )

  if (!isAdminStepUpValid) {
    redirect(`/${locale}/connexion/admin-verification?next=/admin`)
  }

  return (
    <AdminShell adminName={resolveAdminName(currentUser)} locale={locale}>
      {children}
    </AdminShell>
  )
}
