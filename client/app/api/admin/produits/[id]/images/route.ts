import { NextRequest, NextResponse } from "next/server"

import { normalizeString } from "@/lib/admin/common"
import {
  createProductStoragePath,
  extractStoragePathFromPublicUrl,
  fetchProductImages,
  saveProductImages,
  type FirestoreProductImage,
} from "@/lib/admin/productImages"
import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import {
  isImageWithinSizeLimit,
  isValidImageMimeType,
} from "@/lib/carousel/validation"
import { getStorageClient } from "@/lib/firebase/admin"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

type ImagePatchPayload = {
  images?: unknown
}

type ImageDeletePayload = {
  url?: unknown
}

function normalizeImageList(value: unknown): FirestoreProductImage[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const normalizedImages = value
    .map((rawImage, index) => {
      if (!rawImage || typeof rawImage !== "object") {
        return null
      }

      const imageRecord = rawImage as {
        url?: unknown
        ordre?: unknown
        est_principale?: unknown
        alt_text?: unknown
      }

      const imageUrl = normalizeString(imageRecord.url)

      if (!imageUrl) {
        return null
      }

      const orderValue =
        typeof imageRecord.ordre === "number" &&
        Number.isFinite(imageRecord.ordre)
          ? Math.max(0, Math.round(imageRecord.ordre))
          : index

      const altTextValue = normalizeString(imageRecord.alt_text)

      return {
        url: imageUrl,
        ordre: orderValue,
        est_principale: imageRecord.est_principale === true,
        alt_text: altTextValue || null,
      } satisfies FirestoreProductImage
    })
    .filter((image): image is FirestoreProductImage => Boolean(image))

  normalizedImages.sort((imageA, imageB) => imageA.ordre - imageB.ordre)

  const hasMainImage = normalizedImages.some((image) => image.est_principale)

  if (!hasMainImage && normalizedImages.length > 0) {
    normalizedImages[0] = {
      ...normalizedImages[0],
      est_principale: true,
    }
  }

  return normalizedImages.map((image, index) => ({
    ...image,
    ordre: index,
  }))
}

async function productExists(productId: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("produit")
    .select("id_produit")
    .eq("id_produit", productId)
    .single()

  return !error && Boolean(data)
}

async function uploadImageFile(
  productId: string,
  file: File,
  fileIndex: number,
): Promise<string> {
  const storage = getStorageClient()
  const bucket = storage.bucket()
  const filePath = createProductStoragePath(productId, file.name, fileIndex)
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  await bucket.file(filePath).save(fileBuffer, {
    metadata: { contentType: file.type },
  })

  await bucket.file(filePath).makePublic()

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`
}

function extractFilesFromFormData(formData: FormData): File[] {
  const multiFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File)

  if (multiFiles.length > 0) {
    return multiFiles
  }

  const singleFile = formData.get("file")

  if (singleFile instanceof File) {
    return [singleFile]
  }

  return []
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const productId = normalizeString(id)

    if (!productId) {
      return NextResponse.json(
        {
          error: "Identifiant produit invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const images = await fetchProductImages(productId)

    return NextResponse.json({ images })
  } catch (error) {
    console.error("Erreur chargement images produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const productId = normalizeString(id)

    if (!productId) {
      return NextResponse.json(
        {
          error: "Identifiant produit invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const hasProduct = await productExists(productId)

    if (!hasProduct) {
      return NextResponse.json(
        {
          error: "Produit introuvable.",
          code: "product_not_found",
        },
        { status: 404 },
      )
    }

    const formData = await request.formData()
    const files = extractFilesFromFormData(formData)

    if (files.length === 0) {
      return NextResponse.json(
        {
          error: "Aucun fichier image fourni.",
          code: "file_required",
        },
        { status: 400 },
      )
    }

    for (const file of files) {
      if (!isValidImageMimeType(file.type)) {
        return NextResponse.json(
          {
            error: "Type de fichier non autorisé (jpeg, png, webp uniquement).",
            code: "file_type_invalid",
          },
          { status: 400 },
        )
      }

      if (!isImageWithinSizeLimit(file.size)) {
        return NextResponse.json(
          {
            error: "Le fichier dépasse la taille maximale de 5 Mo.",
            code: "file_size_invalid",
          },
          { status: 400 },
        )
      }
    }

    const existingImages = await fetchProductImages(productId)

    const uploadedUrls = await Promise.all(
      files.map((file, fileIndex) =>
        uploadImageFile(productId, file, fileIndex),
      ),
    )

    const hasMainImage = existingImages.some((image) => image.est_principale)
    const initialOrder = existingImages.length

    const appendedImages = uploadedUrls.map(
      (imageUrl, imageIndex) =>
        ({
          url: imageUrl,
          ordre: initialOrder + imageIndex,
          est_principale: !hasMainImage && imageIndex === 0,
          alt_text: null,
        }) satisfies FirestoreProductImage,
    )

    const savedImages = await saveProductImages(productId, [
      ...existingImages,
      ...appendedImages,
    ])

    return NextResponse.json({
      images: savedImages,
    })
  } catch (error) {
    console.error("Erreur upload images produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur lors de l upload des images produit.",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const productId = normalizeString(id)

    if (!productId) {
      return NextResponse.json(
        {
          error: "Identifiant produit invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as ImagePatchPayload | null

    const normalizedImages = normalizeImageList(body?.images)

    if (!normalizedImages) {
      return NextResponse.json(
        {
          error: "Le tableau d images est invalide.",
          code: "images_payload_invalid",
        },
        { status: 400 },
      )
    }

    const savedImages = await saveProductImages(productId, normalizedImages)

    return NextResponse.json({
      images: savedImages,
    })
  } catch (error) {
    console.error("Erreur mise a jour images produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess()

  if (deniedResponse) {
    return deniedResponse
  }

  try {
    const { id } = await params
    const productId = normalizeString(id)

    if (!productId) {
      return NextResponse.json(
        {
          error: "Identifiant produit invalide.",
          code: "id_invalid",
        },
        { status: 400 },
      )
    }

    const body = (await request
      .json()
      .catch(() => null)) as ImageDeletePayload | null
    const imageUrl = normalizeString(body?.url)

    if (!imageUrl) {
      return NextResponse.json(
        {
          error: "URL image invalide.",
          code: "image_url_invalid",
        },
        { status: 400 },
      )
    }

    const currentImages = await fetchProductImages(productId)
    const hasTargetImage = currentImages.some((image) => image.url === imageUrl)

    if (!hasTargetImage) {
      return NextResponse.json(
        {
          error: "Image introuvable.",
          code: "image_not_found",
        },
        { status: 404 },
      )
    }

    const remainingImages = currentImages.filter(
      (image) => image.url !== imageUrl,
    )
    const savedImages = await saveProductImages(productId, remainingImages)

    try {
      const storage = getStorageClient()
      const bucket = storage.bucket()
      const storagePath = extractStoragePathFromPublicUrl(imageUrl, bucket.name)

      if (storagePath) {
        await bucket.file(storagePath).delete({ ignoreNotFound: true })
      }
    } catch (storageError) {
      console.error("Erreur suppression fichier storage image produit", {
        storageError,
      })
    }

    return NextResponse.json({ images: savedImages })
  } catch (error) {
    console.error("Erreur suppression image produit admin", { error })

    return NextResponse.json(
      {
        error: "Erreur serveur",
        code: "server_error",
      },
      { status: 500 },
    )
  }
}
