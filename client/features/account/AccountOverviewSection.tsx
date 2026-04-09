"use client"

import {
  Loader2,
  PackageSearch,
  MapPin,
  CreditCard,
  UserRound,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { formatAccountDate, formatAccountPrice } from "./accountUtils"
import type { AccountOrderSummary, AccountProfile } from "./accountTypes"

type DashboardSummaryState = {
  profile: AccountProfile | null
  ordersCount: number
  addressesCount: number
  paymentMethodsCount: number
  latestOrder: AccountOrderSummary | null
}

function getSessionExpiredPath(pathname: string): string {
  const query = new URLSearchParams({
    reason: "session_expired",
    next: pathname,
  })

  return `/connexion?${query.toString()}`
}

export function AccountOverviewSection() {
  const locale = useLocale()
  const t = useTranslations("Account")
  const router = useRouter()
  const pathname = usePathname()

  const [summary, setSummary] = useState<DashboardSummaryState>({
    profile: null,
    ordersCount: 0,
    addressesCount: 0,
    paymentMethodsCount: 0,
    latestOrder: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSummary = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [
          profileResponse,
          ordersResponse,
          addressesResponse,
          paymentsResponse,
        ] = await Promise.all([
          fetch("/api/account/profile", { cache: "no-store" }),
          fetch("/api/account/orders", { cache: "no-store" }),
          fetch("/api/account/addresses", { cache: "no-store" }),
          fetch("/api/account/payment-methods", { cache: "no-store" }),
        ])

        const hasSessionExpired = [
          profileResponse,
          ordersResponse,
          addressesResponse,
          paymentsResponse,
        ].some((response) => response.status === 401)

        if (hasSessionExpired) {
          router.replace(getSessionExpiredPath(pathname))
          return
        }

        if (
          !profileResponse.ok ||
          !ordersResponse.ok ||
          !addressesResponse.ok ||
          !paymentsResponse.ok
        ) {
          if (isMounted) {
            setErrorMessage(t("overview.errors.summaryLoadFailed"))
          }
          return
        }

        const [
          profilePayload,
          ordersPayload,
          addressesPayload,
          paymentsPayload,
        ] = await Promise.all([
          profileResponse.json().catch(() => null),
          ordersResponse.json().catch(() => null),
          addressesResponse.json().catch(() => null),
          paymentsResponse.json().catch(() => null),
        ])

        const orders = Array.isArray(ordersPayload?.orders)
          ? (ordersPayload.orders as AccountOrderSummary[])
          : []

        if (!isMounted) {
          return
        }

        setSummary({
          profile: profilePayload?.profile ?? null,
          ordersCount: orders.length,
          addressesCount: Array.isArray(addressesPayload?.addresses)
            ? addressesPayload.addresses.length
            : 0,
          paymentMethodsCount: Array.isArray(paymentsPayload?.paymentMethods)
            ? paymentsPayload.paymentMethods.length
            : 0,
          latestOrder: orders[0] ?? null,
        })
      } catch (error) {
        console.error("Erreur chargement vue d'ensemble compte", { error })

        if (isMounted) {
          setErrorMessage(t("overview.errors.temporaryError"))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isMounted = false
    }
  }, [pathname, router, t])

  const latestOrderAmount = useMemo(() => {
    if (!summary.latestOrder) {
      return null
    }

    return formatAccountPrice(summary.latestOrder.totalTtc, locale)
  }, [locale, summary.latestOrder])

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-slate-600"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {t("overview.loading")}
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-error" role="alert">
          {errorMessage}
        </p>
        <Button type="button" onClick={() => router.refresh()}>
          {t("overview.retry")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-slate-50/70 p-4">
        <h2 className="heading-font text-xl text-brand-nav">
          {t("overview.greetingTitle")}
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          {summary.profile
            ? `${summary.profile.firstName} ${summary.profile.lastName}`.trim()
            : t("overview.anonymousUser")}
        </p>
        <p className="text-sm text-slate-600">
          {summary.profile?.email || t("overview.emailUnavailable")}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <PackageSearch className="size-4" aria-hidden="true" />
            {t("dashboard.navigation.orders")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand-nav">
            {summary.ordersCount}
          </p>
        </article>

        <article className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="size-4" aria-hidden="true" />
            {t("dashboard.navigation.addresses")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand-nav">
            {summary.addressesCount}
          </p>
        </article>

        <article className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <CreditCard className="size-4" aria-hidden="true" />
            {t("dashboard.navigation.payments")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand-nav">
            {summary.paymentMethodsCount}
          </p>
        </article>

        <article className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <UserRound className="size-4" aria-hidden="true" />
            {t("dashboard.navigation.profile")}
          </p>
          <p className="mt-1 text-sm font-medium text-brand-nav">
            {summary.profile
              ? t("overview.profileComplete")
              : t("overview.profileIncomplete")}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="heading-font text-lg text-brand-nav">
          {t("overview.latestOrder.title")}
        </h3>

        {summary.latestOrder ? (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-brand-nav">
                {t("overview.latestOrder.numberLabel")}
              </span>{" "}
              {summary.latestOrder.orderNumber}
            </p>
            <p>
              <span className="font-medium text-brand-nav">
                {t("overview.latestOrder.dateLabel")}
              </span>{" "}
              {formatAccountDate(summary.latestOrder.createdAt, locale)}
            </p>
            <p>
              <span className="font-medium text-brand-nav">
                {t("overview.latestOrder.amountLabel")}
              </span>{" "}
              {latestOrderAmount}
            </p>
            <Button
              asChild
              className="mt-2 bg-brand-cta text-white hover:bg-brand-cta/90"
            >
              <Link
                href={`/mon-compte/commandes/${summary.latestOrder.orderNumber}`}
              >
                {t("overview.latestOrder.viewDetail")}
              </Link>
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {t("overview.latestOrder.empty")}
          </p>
        )}
      </section>
    </div>
  )
}
