import { Trash2, Upload } from "lucide-react"
import Image from "next/image"
import type { ChangeEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { PendingProductImage } from "./useAdminProductPendingImages"

type AdminProductPendingImagesSectionProps = {
  pendingImages: PendingProductImage[]
  onPendingImagesChange: (event: ChangeEvent<HTMLInputElement>) => void
  onPendingImageMainSelection: (imageId: string) => void
  onPendingImageMove: (imageId: string, direction: "up" | "down") => void
  onPendingImageDelete: (imageId: string) => void
  onPendingImageAltTextUpdate: (imageId: string, altText: string) => void
}

export function AdminProductPendingImagesSection({
  pendingImages,
  onPendingImagesChange,
  onPendingImageMainSelection,
  onPendingImageMove,
  onPendingImageDelete,
  onPendingImageAltTextUpdate,
}: AdminProductPendingImagesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-brand-nav">Images produit</CardTitle>
        <CardDescription>
          Ajoutez plusieurs images dès la création. Elles seront uploadées après
          enregistrement du produit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={onPendingImagesChange}
          />
          <span className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-3 py-2 text-sm font-medium text-white">
            <Upload className="size-4" aria-hidden="true" />
            Sélectionner des images
          </span>
        </label>

        {pendingImages.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-slate-50 p-5 text-sm text-slate-600">
            Aucune image sélectionnée pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingImages.map((pendingImage, imageIndex) => (
              <article
                key={pendingImage.id}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <Image
                  src={pendingImage.previewUrl}
                  alt={`Prévisualisation ${imageIndex + 1}`}
                  width={640}
                  height={360}
                  className="h-32 w-full rounded-md object-cover"
                />

                {pendingImage.estPrincipale ? (
                  <Badge className="bg-brand-cta text-white">Principale</Badge>
                ) : null}

                <label className="block space-y-1 text-xs text-slate-600">
                  <span>Texte alternatif</span>
                  <input
                    type="text"
                    value={pendingImage.altText}
                    onChange={(event) => {
                      onPendingImageAltTextUpdate(
                        pendingImage.id,
                        event.target.value,
                      )
                    }}
                    className="h-8 w-full rounded-md border border-border px-2 text-sm"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onPendingImageMainSelection(pendingImage.id)
                    }}
                    disabled={pendingImage.estPrincipale}
                  >
                    Principale
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onPendingImageMove(pendingImage.id, "up")
                    }}
                    disabled={imageIndex === 0}
                  >
                    Monter
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onPendingImageMove(pendingImage.id, "down")
                    }}
                    disabled={imageIndex === pendingImages.length - 1}
                  >
                    Descendre
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-brand-error hover:text-brand-error"
                    onClick={() => {
                      onPendingImageDelete(pendingImage.id)
                    }}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Supprimer
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
