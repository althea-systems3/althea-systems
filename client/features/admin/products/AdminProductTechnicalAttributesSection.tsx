import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { AdminProductFormValues } from "./adminProductsTypes"

type AdminProductTechnicalAttributesSectionProps = {
  technicalAttributes: AdminProductFormValues["technicalAttributes"]
  onAttributeChange: (
    attributeId: string,
    fieldName: "key" | "value",
    fieldValue: string,
  ) => void
  onAddAttribute: () => void
  onRemoveAttribute: (attributeId: string) => void
}

export function AdminProductTechnicalAttributesSection({
  technicalAttributes,
  onAttributeChange,
  onAddAttribute,
  onRemoveAttribute,
}: AdminProductTechnicalAttributesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-brand-nav">
          Caractéristiques techniques
        </CardTitle>
        <CardDescription>
          Décrivez les propriétés techniques sous forme clé/valeur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {technicalAttributes.map((attribute) => (
          <div
            key={attribute.id}
            className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="text"
              value={attribute.key}
              onChange={(event) => {
                onAttributeChange(attribute.id, "key", event.target.value)
              }}
              placeholder="Ex: Puissance"
              className="h-10 w-full rounded-md border border-border px-3"
            />
            <input
              type="text"
              value={attribute.value}
              onChange={(event) => {
                onAttributeChange(attribute.id, "value", event.target.value)
              }}
              placeholder="Ex: 1200W"
              className="h-10 w-full rounded-md border border-border px-3"
            />
            <Button
              type="button"
              variant="outline"
              className="text-brand-error hover:text-brand-error"
              onClick={() => {
                onRemoveAttribute(attribute.id)
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Suppr.
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={onAddAttribute}>
          <Plus className="size-4" aria-hidden="true" />
          Ajouter une caractéristique
        </Button>
      </CardContent>
    </Card>
  )
}
