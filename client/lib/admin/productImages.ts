import { getFirestoreClient } from "@/lib/firebase/admin"
import {
  FIRESTORE_IMAGES_PRODUITS,
  TOP_PRODUITS_STORAGE_PATH,
} from "@/lib/top-produits/constants"

const FIRESTORE_IN_QUERY_LIMIT = 30

export type FirestoreProductImage = {
  url: string
  ordre: number
  est_principale: boolean
  alt_text: string | null
}

type FirestoreProductImagesDoc = {
  produit_id: string
  images?: unknown
  image_url?: unknown
}

function getSafeInteger(value: unknown, fallbackValue: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  return fallbackValue
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeImagesArray(rawImages: unknown): FirestoreProductImage[] {
  if (!Array.isArray(rawImages)) {
    return []
  }

  const sanitizedImages = rawImages
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

      if (!isNonEmptyString(imageRecord.url)) {
        return null
      }

      return {
        url: imageRecord.url.trim(),
        ordre: getSafeInteger(imageRecord.ordre, index),
        est_principale: imageRecord.est_principale === true,
        alt_text: isNonEmptyString(imageRecord.alt_text)
          ? imageRecord.alt_text.trim()
          : null,
      } satisfies FirestoreProductImage
    })
    .filter((image): image is FirestoreProductImage => Boolean(image))

  sanitizedImages.sort((imageA, imageB) => imageA.ordre - imageB.ordre)

  const hasMainImage = sanitizedImages.some((image) => image.est_principale)

  if (!hasMainImage && sanitizedImages.length > 0) {
    sanitizedImages[0] = {
      ...sanitizedImages[0],
      est_principale: true,
    }
  }

  return sanitizedImages.map((image, index) => ({
    ...image,
    ordre: index,
  }))
}

function normalizeImageDoc(
  imageDoc: FirestoreProductImagesDoc,
): FirestoreProductImage[] {
  const normalizedImages = normalizeImagesArray(imageDoc.images)

  if (normalizedImages.length > 0) {
    return normalizedImages
  }

  if (isNonEmptyString(imageDoc.image_url)) {
    return [
      {
        url: imageDoc.image_url,
        ordre: 0,
        est_principale: true,
        alt_text: null,
      },
    ]
  }

  return []
}

async function findProductImagesDocument(productId: string): Promise<{
  id: string
  images: FirestoreProductImage[]
} | null> {
  const firestore = getFirestoreClient()

  const snapshot = await firestore
    .collection(FIRESTORE_IMAGES_PRODUITS)
    .where("produit_id", "==", productId)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const documentSnapshot = snapshot.docs[0]
  const imageDoc = documentSnapshot.data() as FirestoreProductImagesDoc

  return {
    id: documentSnapshot.id,
    images: normalizeImageDoc(imageDoc),
  }
}

export function extractMainImageUrl(
  images: FirestoreProductImage[],
): string | null {
  if (images.length === 0) {
    return null
  }

  const mainImage = images.find((image) => image.est_principale)

  if (mainImage) {
    return mainImage.url
  }

  return images[0].url
}

export async function fetchProductImages(
  productId: string,
): Promise<FirestoreProductImage[]> {
  const productImageDoc = await findProductImagesDocument(productId)

  if (!productImageDoc) {
    return []
  }

  return productImageDoc.images
}

export async function fetchProductImagesByIds(
  productIds: string[],
): Promise<Map<string, FirestoreProductImage[]>> {
  const productImagesMap = new Map<string, FirestoreProductImage[]>()

  if (productIds.length === 0) {
    return productImagesMap
  }

  try {
    const firestore = getFirestoreClient()

    for (
      let startIndex = 0;
      startIndex < productIds.length;
      startIndex += FIRESTORE_IN_QUERY_LIMIT
    ) {
      const productIdsBatch = productIds.slice(
        startIndex,
        startIndex + FIRESTORE_IN_QUERY_LIMIT,
      )

      const snapshot = await firestore
        .collection(FIRESTORE_IMAGES_PRODUITS)
        .where("produit_id", "in", productIdsBatch)
        .get()

      snapshot.docs.forEach((doc) => {
        const imageDoc = doc.data() as FirestoreProductImagesDoc

        if (!isNonEmptyString(imageDoc.produit_id)) {
          return
        }

        const normalizedImages = normalizeImageDoc(imageDoc)

        if (normalizedImages.length > 0) {
          productImagesMap.set(imageDoc.produit_id, normalizedImages)
        }
      })
    }
  } catch (error) {
    console.error("Erreur chargement images produits Firestore", { error })
  }

  return productImagesMap
}

export async function saveProductImages(
  productId: string,
  images: FirestoreProductImage[],
): Promise<FirestoreProductImage[]> {
  const firestore = getFirestoreClient()
  const collectionRef = firestore.collection(FIRESTORE_IMAGES_PRODUITS)
  const normalizedImages = normalizeImagesArray(images)
  const productImageDoc = await findProductImagesDocument(productId)

  const payload = {
    produit_id: productId,
    images: normalizedImages,
  }

  if (productImageDoc) {
    await collectionRef.doc(productImageDoc.id).set(payload, { merge: true })
  } else {
    await collectionRef.add(payload)
  }

  return normalizedImages
}

export function createProductStoragePath(
  productId: string,
  originalFileName: string,
  fileIndex: number,
): string {
  const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.]/g, "_")
  const extension = sanitizedFileName.split(".").pop() ?? "bin"
  const timestamp = Date.now()

  return `${TOP_PRODUITS_STORAGE_PATH}/${productId}/${timestamp}-${fileIndex}.${extension}`
}

export function extractStoragePathFromPublicUrl(
  publicUrl: string,
  bucketName: string,
): string | null {
  try {
    const parsedUrl = new URL(publicUrl)

    if (parsedUrl.hostname !== "storage.googleapis.com") {
      return null
    }

    const normalizedPath = parsedUrl.pathname.replace(/^\//, "")
    const bucketPathPrefix = `${bucketName}/`

    if (!normalizedPath.startsWith(bucketPathPrefix)) {
      return null
    }

    return decodeURIComponent(normalizedPath.slice(bucketPathPrefix.length))
  } catch {
    return null
  }
}
