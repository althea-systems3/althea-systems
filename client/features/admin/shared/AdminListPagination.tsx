import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

type AdminListPaginationProps = {
  page: number
  totalPages: number
  isLoading: boolean
  summaryText?: string
  onPageChange: (nextPage: number) => void
  onRefresh?: () => void
}

export function AdminListPagination({
  page,
  totalPages,
  isLoading,
  summaryText,
  onPageChange,
  onRefresh,
}: AdminListPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-slate-600">
        {summaryText ?? `Page ${page} / ${totalPages}`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || isLoading}
        >
          Précédent
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages || isLoading}
        >
          Suivant
        </Button>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Rafraîchir
          </Button>
        ) : null}
      </div>
    </div>
  )
}
