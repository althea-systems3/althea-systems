import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ADMIN_PRODUCT_TVA_OPTIONS } from "./adminProductsUtils"
import type {
  AdminCategory,
  AdminProductFormValues,
} from "./adminProductsTypes"

export type AdminProductFieldErrors = {
  nom?: string
  prixHt?: string
  quantiteStock?: string
  slug?: string
}

type AdminProductMainInfoSectionProps = {
  formValues: AdminProductFormValues
  categories: AdminCategory[]
  fieldErrors: AdminProductFieldErrors
  computedPriceTtc: string
  onFieldChange: <K extends keyof AdminProductFormValues>(
    fieldName: K,
    fieldValue: AdminProductFormValues[K],
  ) => void
  onCategoryToggle: (categoryId: string) => void
}

export function AdminProductMainInfoSection({
  formValues,
  categories,
  fieldErrors,
  computedPriceTtc,
  onFieldChange,
  onCategoryToggle,
}: AdminProductMainInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-brand-nav">
          Informations principales
        </CardTitle>
        <CardDescription>
          Identité, tarifs, stock et publication du produit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Nom du produit</span>
            <input
              type="text"
              value={formValues.nom}
              onChange={(event) => {
                onFieldChange("nom", event.target.value)
              }}
              className="h-10 w-full rounded-md border border-border px-3"
              aria-invalid={Boolean(fieldErrors.nom)}
              aria-describedby={
                fieldErrors.nom ? "admin-product-name-error" : undefined
              }
            />
            {fieldErrors.nom ? (
              <span
                id="admin-product-name-error"
                className="text-xs text-brand-error"
              >
                {fieldErrors.nom}
              </span>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span>Slug SEO</span>
            <input
              type="text"
              value={formValues.slug}
              onChange={(event) => {
                onFieldChange("slug", event.target.value)
              }}
              placeholder="exemple-produit-tech"
              className="h-10 w-full rounded-md border border-border px-3"
              aria-invalid={Boolean(fieldErrors.slug)}
              aria-describedby={
                fieldErrors.slug ? "admin-product-slug-error" : undefined
              }
            />
            {fieldErrors.slug ? (
              <span
                id="admin-product-slug-error"
                className="text-xs text-brand-error"
              >
                {fieldErrors.slug}
              </span>
            ) : null}
          </label>
        </div>

        <label className="block space-y-1 text-sm text-slate-700">
          <span>Description</span>
          <textarea
            rows={4}
            value={formValues.description}
            onChange={(event) => {
              onFieldChange("description", event.target.value)
            }}
            className="w-full rounded-md border border-border px-3 py-2"
          />
        </label>

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Catégories
          </legend>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const isSelected = formValues.categoryIds.includes(
                category.id_categorie,
              )

              return (
                <label
                  key={category.id_categorie}
                  className="inline-flex items-center gap-2 rounded-md border border-border/80 px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      onCategoryToggle(category.id_categorie)
                    }}
                  />
                  <span>{category.nom}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Prix HT</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formValues.prixHt}
              onChange={(event) => {
                onFieldChange("prixHt", event.target.value)
              }}
              className="h-10 w-full rounded-md border border-border px-3"
              aria-invalid={Boolean(fieldErrors.prixHt)}
              aria-describedby={
                fieldErrors.prixHt ? "admin-product-prixht-error" : undefined
              }
            />
            {fieldErrors.prixHt ? (
              <span
                id="admin-product-prixht-error"
                className="text-xs text-brand-error"
              >
                {fieldErrors.prixHt}
              </span>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span>TVA</span>
            <select
              value={formValues.tva}
              onChange={(event) => {
                onFieldChange(
                  "tva",
                  event.target.value as AdminProductFormValues["tva"],
                )
              }}
              className="h-10 w-full rounded-md border border-border px-3"
            >
              {ADMIN_PRODUCT_TVA_OPTIONS.map((tvaOption) => (
                <option key={tvaOption.value} value={tvaOption.value}>
                  {tvaOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span>Prix TTC (auto)</span>
            <input
              type="text"
              value={computedPriceTtc}
              readOnly
              className="h-10 w-full rounded-md border border-border bg-slate-50 px-3"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-700">
            <span>Quantité en stock</span>
            <input
              type="number"
              step="1"
              min="0"
              value={formValues.quantiteStock}
              onChange={(event) => {
                onFieldChange("quantiteStock", event.target.value)
              }}
              className="h-10 w-full rounded-md border border-border px-3"
              aria-invalid={Boolean(fieldErrors.quantiteStock)}
              aria-describedby={
                fieldErrors.quantiteStock
                  ? "admin-product-quantite-stock-error"
                  : undefined
              }
            />
            {fieldErrors.quantiteStock ? (
              <span
                id="admin-product-quantite-stock-error"
                className="text-xs text-brand-error"
              >
                {fieldErrors.quantiteStock}
              </span>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Statut</span>
            <select
              value={formValues.statut}
              onChange={(event) => {
                onFieldChange(
                  "statut",
                  event.target.value as AdminProductFormValues["statut"],
                )
              }}
              className="h-10 w-full rounded-md border border-border px-3"
            >
              <option value="brouillon">Brouillon</option>
              <option value="publie">Publié</option>
            </select>
          </label>

          <div className="flex items-end">
            <Badge
              className={
                formValues.statut === "publie"
                  ? "bg-brand-success text-white"
                  : "bg-slate-200 text-slate-700"
              }
            >
              {formValues.statut === "publie" ? "Publié" : "Brouillon"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
