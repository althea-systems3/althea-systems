import { type ChangeEvent, useEffect, useRef, useState } from "react"

export type PendingProductImage = {
  id: string
  file: File
  previewUrl: string
  estPrincipale: boolean
  altText: string
}

function buildPendingImageId(fileName: string, imageIndex: number): string {
  return `${fileName}-${imageIndex}-${Date.now()}`
}

function revokePreviewUrls(images: PendingProductImage[]) {
  images.forEach((image) => {
    URL.revokeObjectURL(image.previewUrl)
  })
}

export function useAdminProductPendingImages() {
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([])
  const pendingImagesRef = useRef<PendingProductImage[]>([])

  useEffect(() => {
    pendingImagesRef.current = pendingImages
  }, [pendingImages])

  useEffect(() => {
    return () => {
      revokePreviewUrls(pendingImagesRef.current)
    }
  }, [])

  function handlePendingImagesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files

    if (!selectedFiles || selectedFiles.length === 0) {
      return
    }

    setPendingImages((previousImages) => {
      const nextImages = [...previousImages]
      const hasMainImage = previousImages.some((image) => image.estPrincipale)

      Array.from(selectedFiles).forEach((file, imageIndex) => {
        const previewUrl = URL.createObjectURL(file)
        nextImages.push({
          id: buildPendingImageId(file.name, imageIndex),
          file,
          previewUrl,
          estPrincipale:
            !hasMainImage && previousImages.length === 0 && imageIndex === 0,
          altText: "",
        })
      })

      return nextImages
    })

    event.currentTarget.value = ""
  }

  function handlePendingImageMainSelection(imageId: string) {
    setPendingImages((previousImages) => {
      return previousImages.map((image) => ({
        ...image,
        estPrincipale: image.id === imageId,
      }))
    })
  }

  function handlePendingImageMove(imageId: string, direction: "up" | "down") {
    setPendingImages((previousImages) => {
      const currentIndex = previousImages.findIndex(
        (image) => image.id === imageId,
      )

      if (currentIndex < 0) {
        return previousImages
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= previousImages.length) {
        return previousImages
      }

      const nextImages = [...previousImages]
      const [movedImage] = nextImages.splice(currentIndex, 1)
      nextImages.splice(targetIndex, 0, movedImage)

      return nextImages
    })
  }

  function handlePendingImageDelete(imageId: string) {
    setPendingImages((previousImages) => {
      const imageToRemove = previousImages.find((image) => image.id === imageId)

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }

      const nextImages = previousImages.filter((image) => image.id !== imageId)
      const hasMainImage = nextImages.some((image) => image.estPrincipale)

      if (!hasMainImage && nextImages.length > 0) {
        nextImages[0] = {
          ...nextImages[0],
          estPrincipale: true,
        }
      }

      return nextImages
    })
  }

  function handlePendingImageAltTextUpdate(imageId: string, altText: string) {
    setPendingImages((previousImages) => {
      return previousImages.map((image) => {
        if (image.id !== imageId) {
          return image
        }

        return {
          ...image,
          altText,
        }
      })
    })
  }

  function clearPendingImages() {
    revokePreviewUrls(pendingImages)
    setPendingImages([])
  }

  return {
    pendingImages,
    handlePendingImagesChange,
    handlePendingImageMainSelection,
    handlePendingImageMove,
    handlePendingImageDelete,
    handlePendingImageAltTextUpdate,
    clearPendingImages,
  }
}
