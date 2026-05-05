import { ShieldCheck } from "lucide-react"
import { type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AuthPageSectionProps = {
  title: string
  description: string
  children: ReactNode
}

type AuthStatusMessageProps = {
  message: string | null
  isError: boolean
}

export function AuthPageSection({
  title,
  description,
  children,
}: AuthPageSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#f0fbfc] via-white to-[#eaf3fb] py-10 sm:py-16 lg:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 25%, rgba(20,184,200,0.12) 0, transparent 45%), radial-gradient(circle at 85% 75%, rgba(28,78,128,0.10) 0, transparent 50%)",
        }}
      />

      <div className="container relative">
        <div className="mx-auto grid max-w-5xl gap-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#0a7490] to-brand-nav p-8 text-white sm:p-10">
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0, transparent 40%)",
              }}
            />
            <div className="relative space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Althea Systems
              </span>
              <h1 className="heading-font text-3xl leading-tight tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="text-sm leading-relaxed text-white/85 sm:text-base">
                {description}
              </p>
            </div>

            <div className="relative mt-8 hidden text-xs text-white/70 lg:block">
              <p>
                Plateforme professionnelle dédiée aux acteurs du secteur médical.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 lg:p-10">{children}</div>
        </div>
      </div>
    </section>
  )
}

type AuthFormCardProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthFormCard({
  title,
  description,
  children,
  footer,
}: AuthFormCardProps) {
  // Note : on n'utilise plus le wrapper Card visible — le AuthPageSection
  // a déjà la box blanche. On garde juste header + content + footer plats.
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <CardTitle className="text-2xl text-brand-nav">{title}</CardTitle>
        <CardDescription className="text-slate-600">
          {description}
        </CardDescription>
      </div>

      <CardContent className="px-0">{children}</CardContent>

      {footer ? <CardFooter className="px-0">{footer}</CardFooter> : null}
    </div>
  )
}

export function AuthStatusMessage({
  message,
  isError,
}: AuthStatusMessageProps) {
  if (!message) {
    return null
  }

  return (
    <Badge
      variant={isError ? "destructive" : "default"}
      className="h-auto w-full justify-start rounded-md px-3 py-2 text-xs"
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      {message}
    </Badge>
  )
}

// Keep Card import for backwards compat (used elsewhere if needed)
export { Card, CardHeader }
