import type { ReactNode } from "react"

import { AccountDashboardLayout } from "@/features/account/AccountDashboardLayout"

type AccountRouteLayoutProps = {
  children: ReactNode
}

export default function AccountRouteLayout({
  children,
}: AccountRouteLayoutProps) {
  return <AccountDashboardLayout>{children}</AccountDashboardLayout>
}
