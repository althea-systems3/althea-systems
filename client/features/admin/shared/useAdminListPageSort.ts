import type { SortDirection } from "@/lib/admin/queryBuilders"

export function getNextSortDirection<T>(
  currentSortBy: T,
  currentDirection: SortDirection,
  nextSortBy: T,
): SortDirection {
  if (currentSortBy !== nextSortBy) {
    return "asc"
  }

  return currentDirection === "asc" ? "desc" : "asc"
}

export function toggleSelection<T extends string>(
  selectedIds: T[],
  id: T,
): T[] {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((currentId) => currentId !== id)
  }
  return [...selectedIds, id]
}
