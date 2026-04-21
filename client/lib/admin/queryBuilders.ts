import { normalizeString } from '@/lib/admin/common';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;

export type SortDirection = 'asc' | 'desc';

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type SortParams<T extends string> = {
  sortBy: T;
  sortDirection: SortDirection;
};

export function parsePositiveInteger(
  value: string | null,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parseFiniteDecimal(value: string | null): number | null {
  if (value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  maxPageSize: number = MAX_PAGE_SIZE,
): PaginationParams {
  const page = parsePositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
  const rawPageSize = parsePositiveInteger(
    searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
  );

  return {
    page,
    pageSize: Math.min(rawPageSize, maxPageSize),
  };
}

export function parseSortParams<T extends string>(
  searchParams: URLSearchParams,
  allowedSortKeys: readonly T[],
  defaultSortBy: T,
  defaultDirection: SortDirection = 'desc',
): SortParams<T> {
  const rawSortBy = searchParams.get('sortBy');
  const sortBy = (allowedSortKeys as readonly string[]).includes(
    rawSortBy ?? '',
  )
    ? (rawSortBy as T)
    : defaultSortBy;

  const rawDirection = searchParams.get('sortDirection');
  const sortDirection: SortDirection =
    rawDirection === 'asc' || rawDirection === 'desc'
      ? rawDirection
      : defaultDirection;

  return { sortBy, sortDirection };
}

export function parseStringFilter(
  searchParams: URLSearchParams,
  key: string,
): string {
  return normalizeString(searchParams.get(key));
}

export function parseEnumFilter<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowedValues: readonly T[],
  fallback: T | 'all',
): T | 'all' {
  const raw = searchParams.get(key);

  if ((allowedValues as readonly string[]).includes(raw ?? '')) {
    return raw as T;
  }

  return fallback;
}

export function parsePriceRange(
  searchParams: URLSearchParams,
  minKey = 'priceMin',
  maxKey = 'priceMax',
): { priceMin: number | null; priceMax: number | null } {
  return {
    priceMin: parseFiniteDecimal(searchParams.get(minKey)),
    priceMax: parseFiniteDecimal(searchParams.get(maxKey)),
  };
}

export function parseDateRange(
  searchParams: URLSearchParams,
  fromKey: string,
  toKey: string,
): { from: Date | null; to: Date | null } {
  return {
    from: parseDate(searchParams.get(fromKey)),
    to: parseDate(searchParams.get(toKey)),
  };
}

export function computePaginationMeta(
  total: number,
  pageSize: number,
  requestedPage: number,
): {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, requestedPage), totalPages);

  return {
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function paginateArray<T>(
  items: T[],
  pagination: PaginationParams,
): T[] {
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  return items.slice(startIndex, startIndex + pagination.pageSize);
}
