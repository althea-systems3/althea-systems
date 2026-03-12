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
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-6 rounded-2xl border border-border/80 bg-white p-4 shadow-sm sm:gap-8 sm:p-6 lg:grid-cols-[1fr_1.1fr] lg:p-8">
        <div className="rounded-xl bg-[#d4f4f7]/70 p-5 sm:p-6">
          <h1 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-700 sm:text-base">
            {description}
          </p>
        </div>

        {children}
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
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-brand-nav">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>{children}</CardContent>

      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
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
      className="h-auto rounded-md px-3 py-1.5 text-xs"
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      {message}
    </Badge>
  )
}
