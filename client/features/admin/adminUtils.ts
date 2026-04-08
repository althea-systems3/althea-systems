export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-"
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate)
}

export function mapOrderStatusLabel(status: string): string {
  if (status === "en_attente") {
    return "En attente"
  }

  if (status === "en_cours") {
    return "En cours"
  }

  if (status === "terminee") {
    return "Terminée"
  }

  if (status === "annulee") {
    return "Annulée"
  }

  return status
}

export function mapOrderStatusClassName(status: string): string {
  if (status === "en_attente") {
    return "bg-brand-alert text-white"
  }

  if (status === "en_cours") {
    return "bg-brand-cta text-white"
  }

  if (status === "terminee") {
    return "bg-brand-success text-white"
  }

  if (status === "annulee") {
    return "bg-brand-error text-white"
  }

  return "bg-slate-200 text-slate-700"
}

export function mapProductStatusLabel(status: string): string {
  return status === "publie" ? "Publié" : "Brouillon"
}

export function mapProductStatusClassName(status: string): string {
  return status === "publie"
    ? "bg-brand-success text-white"
    : "bg-slate-200 text-slate-700"
}
