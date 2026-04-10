import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { isAdminTwoFactorVerified } from "@/lib/auth/adminTwoFactor"
import { ADMIN_2FA_VERIFIED_COOKIE_NAME } from "@/lib/auth/constants"
import { getCurrentUser } from "@/lib/auth/session"

export async function verifyAdminAccess(): Promise<NextResponse | null> {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    )
  }

  const isAdmin = currentUser.userProfile?.est_admin === true

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs." },
      { status: 403 },
    )
  }

  const cookieStore = await cookies()
  const adminStepUpToken = cookieStore.get(
    ADMIN_2FA_VERIFIED_COOKIE_NAME,
  )?.value
  const isAdminStepUpValid = isAdminTwoFactorVerified(
    adminStepUpToken,
    currentUser.user.id,
  )

  if (!isAdminStepUpValid) {
    return NextResponse.json(
      { error: "Validation 2FA administrateur requise." },
      { status: 403 },
    )
  }

  return null
}
