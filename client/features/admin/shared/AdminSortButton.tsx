import { ArrowDown, ArrowUp } from "lucide-react"
import type { ReactNode } from "react"

type AdminSortButtonProps<T extends string> = {
  column: T
  currentSortBy: T
  currentDirection: "asc" | "desc"
  onSort: (column: T) => void
  children: ReactNode
}

export function AdminSortButton<T extends string>({
  column,
  currentSortBy,
  currentDirection,
  onSort,
  children,
}: AdminSortButtonProps<T>) {
  const isActive = currentSortBy === column

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1"
      onClick={() => onSort(column)}
    >
      {children}
      {isActive ? (
        currentDirection === "asc" ? (
          <ArrowUp className="size-3.5" aria-hidden="true" />
        ) : (
          <ArrowDown className="size-3.5" aria-hidden="true" />
        )
      ) : null}
    </button>
  )
}
