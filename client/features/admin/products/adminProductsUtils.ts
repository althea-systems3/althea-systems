import {
  formatCurrency,
  formatDate,
  mapProductStatusClassName,
  mapProductStatusLabel,
} from "@/features/admin/adminUtils"

import type {
  AdminProduct,
  AdminProductFormTechnicalAttribute,
  AdminProductFormValues,
  AdminProductListFilters,
  AdminProductStatus,
  AdminProductTva,
} from "./adminProductsTypes"

export const ADMIN_PRODUCT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export const ADMIN_PRODUCT_TVA_OPTIONS: Array<{
  value: AdminProductTva
  label: string
}> = [
  { value: "20", label: "20%" },
  { value: "10", label: "10%" },
  { value: "5.5", label: "5,5%" },
  { value: "0", label: "0%" },
]

export const ADMIN_PRODUCT_SORT_LABELS: Record<string, string> = {
  nom: "Nom",
  prix_ht: "Prix HT",
  prix_ttc: "Prix TTC",
  quantite_stock: "Quantité",
  statut: "Statut",
  date_creation: "Date de création",
}

const EMPTY_TECHNICAL_ATTRIBUTE_ID = "technical-attribute-empty"

export const INITIAL_ADMIN_PRODUCT_FILTERS: AdminProductListFilters = {
  search: "",
  status: "all",
  categoryId: "",
  availability: "all",
  createdFrom: "",
  createdTo: "",
  priceMin: "",
  priceMax: "",
  sortBy: "nom",
  sortDirection: "asc",
  page: 1,
  pageSize: 25,
}

export function createEmptyTechnicalAttribute(
  id: string = EMPTY_TECHNICAL_ATTRIBUTE_ID,
): AdminProductFormTechnicalAttribute {
  return {
    id,
    key: "",
    value: "",
  }
}

export function createInitialAdminProductFormValues(): AdminProductFormValues {
  return {
    nom: "",
    description: "",
    categoryIds: [],
    prixHt: "",
    tva: "20",
    prixTtc: "",
    quantiteStock: "0",
    statut: "brouillon",
    slug: "",
    technicalAttributes: [createEmptyTechnicalAttribute()],
  }
}

export function parsePositiveNumber(value: string): number | null {
  if (value.trim().length === 0) {
    return null
  }

  const parsedValue = Number.parseFloat(value)

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null
  }

  return parsedValue
}

export function calculateProductPriceTtc(
  priceHt: number,
  tva: AdminProductTva,
): number {
  const vatRate = Number.parseFloat(tva.replace(",", "."))
  return Math.round(priceHt * (1 + vatRate / 100) * 100) / 100
}

export function calculateProductPriceHt(
  priceTtc: number,
  tva: AdminProductTva,
): number {
  const vatRate = Number.parseFloat(tva.replace(",", "."))
  const vatMultiplier = 1 + vatRate / 100

  if (vatMultiplier <= 0) {
    return 0
  }

  return Math.round((priceTtc / vatMultiplier) * 100) / 100
}

export function getProductAvailabilityLabel(stockQuantity: number): string {
  return stockQuantity > 0 ? "Disponible" : "Rupture"
}

export function getProductAvailabilityClassName(stockQuantity: number): string {
  return stockQuantity > 0
    ? "bg-brand-success text-white"
    : "bg-brand-alert text-white"
}

export function buildAdminProductsQueryString(
  filters: AdminProductListFilters,
): string {
  const searchParams = new URLSearchParams()

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim())
  }

  if (filters.status !== "all") {
    searchParams.set("status", filters.status)
  }

  if (filters.categoryId) {
    searchParams.set("categoryId", filters.categoryId)
  }

  if (filters.availability !== "all") {
    searchParams.set("availability", filters.availability)
  }

  if (filters.createdFrom) {
    searchParams.set("createdFrom", filters.createdFrom)
  }

  if (filters.createdTo) {
    searchParams.set("createdTo", filters.createdTo)
  }

  if (filters.priceMin.trim()) {
    searchParams.set("priceMin", filters.priceMin.trim())
  }

  if (filters.priceMax.trim()) {
    searchParams.set("priceMax", filters.priceMax.trim())
  }

  searchParams.set("sortBy", filters.sortBy)
  searchParams.set("sortDirection", filters.sortDirection)
  searchParams.set("page", String(filters.page))
  searchParams.set("pageSize", String(filters.pageSize))

  return searchParams.toString()
}

export function mapProductToFormValues(
  product: AdminProduct,
): AdminProductFormValues {
  const technicalAttributes = convertCharacteristicsToTechnicalAttributes(
    product.caracteristique_tech,
  )

  return {
    nom: product.nom,
    description: product.description ?? "",
    categoryIds: product.categories.map((category) => category.id_categorie),
    prixHt: String(product.prix_ht),
    tva: product.tva,
    prixTtc: String(product.prix_ttc),
    quantiteStock: String(product.quantite_stock),
    statut: product.statut,
    slug: product.slug,
    technicalAttributes:
      technicalAttributes.length > 0
        ? technicalAttributes
        : [createEmptyTechnicalAttribute()],
  }
}

export function convertCharacteristicsToTechnicalAttributes(
  characteristics: Record<string, unknown> | null,
): AdminProductFormTechnicalAttribute[] {
  if (!characteristics) {
    return []
  }

  return Object.entries(characteristics).map(
    ([characteristicKey, rawValue]) => {
      return {
        id: `${characteristicKey}-${Math.random().toString(36).slice(2, 8)}`,
        key: characteristicKey,
        value:
          typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue),
      }
    },
  )
}

export function buildTechnicalCharacteristicsPayload(
  technicalAttributes: AdminProductFormTechnicalAttribute[],
): Record<string, unknown> | null {
  const filteredAttributes = technicalAttributes.filter(
    (attribute) => attribute.key.trim() && attribute.value.trim(),
  )

  if (filteredAttributes.length === 0) {
    return null
  }

  return filteredAttributes.reduce<Record<string, unknown>>(
    (characteristics, attribute) => {
      characteristics[attribute.key.trim()] = attribute.value.trim()
      return characteristics
    },
    {},
  )
}

function escapeCsvCell(cellValue: string): string {
  const normalizedValue = cellValue.replaceAll('"', '""')
  return `"${normalizedValue}"`
}

function escapeXmlCell(cellValue: string): string {
  return cellValue
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function mapProductToExportCells(product: AdminProduct): string[] {
  return [
    product.id_produit,
    product.nom,
    product.description ?? "",
    product.categories.map((category) => category.nom).join(", "),
    product.prix_ht.toFixed(2),
    product.tva,
    product.prix_ttc.toFixed(2),
    String(product.quantite_stock),
    product.statut,
    product.date_creation ?? "",
  ]
}

export function buildProductsCsvContent(products: AdminProduct[]): string {
  const headers = [
    "ID",
    "Nom",
    "Description",
    "Catégories",
    "Prix HT",
    "TVA",
    "Prix TTC",
    "Quantité en stock",
    "Statut",
    "Date de création",
  ]

  const csvLines = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...products.map((product) => {
      return mapProductToExportCells(product)
        .map((cellValue) => escapeCsvCell(cellValue))
        .join(",")
    }),
  ]

  return csvLines.join("\n")
}

export function buildProductsExcelXmlContent(products: AdminProduct[]): string {
  const headers = [
    "ID",
    "Nom",
    "Description",
    "Catégories",
    "Prix HT",
    "TVA",
    "Prix TTC",
    "Quantité en stock",
    "Statut",
    "Date de création",
  ]

  const headersRowXml = headers
    .map(
      (header) =>
        `<Cell><Data ss:Type="String">${escapeXmlCell(header)}</Data></Cell>`,
    )
    .join("")

  const rowsXml = products
    .map((product) => {
      const rowCellsXml = mapProductToExportCells(product)
        .map((cellValue) => {
          return `<Cell><Data ss:Type="String">${escapeXmlCell(cellValue)}</Data></Cell>`
        })
        .join("")

      return `<Row>${rowCellsXml}</Row>`
    })
    .join("")

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    ' <Worksheet ss:Name="Produits">',
    "  <Table>",
    `   <Row>${headersRowXml}</Row>`,
    `   ${rowsXml}`,
    "  </Table>",
    " </Worksheet>",
    "</Workbook>",
  ].join("")
}

export function triggerFileDownload(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const fileBlob = new Blob([content], { type: mimeType })
  const fileUrl = URL.createObjectURL(fileBlob)
  const anchorElement = document.createElement("a")

  anchorElement.href = fileUrl
  anchorElement.download = fileName
  document.body.appendChild(anchorElement)
  anchorElement.click()
  document.body.removeChild(anchorElement)

  setTimeout(() => {
    URL.revokeObjectURL(fileUrl)
  }, 0)
}

export function mapProductStatusUi(status: AdminProductStatus): {
  label: string
  className: string
} {
  return {
    label: mapProductStatusLabel(status),
    className: mapProductStatusClassName(status),
  }
}

export function formatProductPriceDisplay(price: number): string {
  return formatCurrency(price)
}

export function formatProductDateDisplay(dateValue: string | null): string {
  return formatDate(dateValue)
}
