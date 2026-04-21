import { AlertCircle } from "lucide-react"
import type { ReactNode } from "react"

type AdminListAlertProps = {
  message: string | null
  children?: ReactNode
}

export function AdminListErrorAlert({ message, children }: AdminListAlertProps) {
  if (!message) return null

  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-brand-error/20 bg-red-50 p-4 text-sm text-brand-error"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-4" aria-hidden="true" />
      <p>{message}</p>
      {children}
    </div>
  )
}

export function AdminListNoticeAlert({ message }: AdminListAlertProps) {
  if (!message) return null

  return (
    <div
      className="rounded-xl border border-brand-success/20 bg-emerald-50 p-4 text-sm text-brand-success"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
