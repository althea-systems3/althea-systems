import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_IMAGES_CATEGORIES } from "@/lib/categories/constants"

const FIRESTORE_IN_QUERY_LIMIT = 30

type FirestoreCategoryImageDoc = {
  categorie_id?: unknown
  category_id?: unknown
  image_url?: unknown
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalizedValue = value.trim()
  return normalizedValue ? normalizedValue : null
}

function extractCategoryId(imageDoc: FirestoreCategoryImageDoc): string | null {
  return (
    toNonEmptyString(imageDoc.categorie_id) ??
    toNonEmptyString(imageDoc.category_id)
  )
}

function extractImageUrl(imageDoc: FirestoreCategoryImageDoc): string | null {
  return toNonEmptyString(imageDoc.image_url)
}

async function collectImagesByField(
  fieldName: "categorie_id" | "category_id",
  categoryIds: string[],
  imagesByCategoryId: Map<string, string>,
): Promise<void> {
  const firestore = getFirestoreClient()

  for (
    let startIndex = 0;
    startIndex < categoryIds.length;
    startIndex += FIRESTORE_IN_QUERY_LIMIT
  ) {
    const categoryIdsBatch = categoryIds.slice(
      startIndex,
      startIndex + FIRESTORE_IN_QUERY_LIMIT,
    )

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_CATEGORIES)
      .where(fieldName, "in", categoryIdsBatch)
      .get()

    snapshot.docs.forEach((doc) => {
      const imageDoc = doc.data() as FirestoreCategoryImageDoc
      const categoryId = extractCategoryId(imageDoc)
      const imageUrl = extractImageUrl(imageDoc)

      if (!categoryId || !imageUrl) {
        return
      }

      if (!imagesByCategoryId.has(categoryId)) {
        imagesByCategoryId.set(categoryId, imageUrl)
      }
    })
  }
}

export async function fetchCategoryImagesByIds(
  categoryIds: string[],
): Promise<Map<string, string>> {
  const imagesByCategoryId = new Map<string, string>()

  if (categoryIds.length === 0) {
    return imagesByCategoryId
  }

  try {
    await collectImagesByField("categorie_id", categoryIds, imagesByCategoryId)
  } catch (error) {
    console.error(
      "Erreur chargement images catégories Firestore via categorie_id",
      {
        error,
      },
    )
  }

  try {
    await collectImagesByField("category_id", categoryIds, imagesByCategoryId)
  } catch (error) {
    console.error(
      "Erreur chargement images catégories Firestore via category_id",
      {
        error,
      },
    )
  }

  return imagesByCategoryId
}

export async function fetchCategoryImageById(
  categoryId: string,
): Promise<string | null> {
  const imagesByCategoryId = await fetchCategoryImagesByIds([categoryId])
  return imagesByCategoryId.get(categoryId) ?? null
}

export async function deleteCategoryImages(categoryId: string): Promise<void> {
  const firestore = getFirestoreClient()

  const [snapshotByFrenchField, snapshotByEnglishField] = await Promise.all([
    firestore
      .collection(FIRESTORE_IMAGES_CATEGORIES)
      .where("categorie_id", "==", categoryId)
      .get(),
    firestore
      .collection(FIRESTORE_IMAGES_CATEGORIES)
      .where("category_id", "==", categoryId)
      .get(),
  ])

  const docsById = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>()

  snapshotByFrenchField.docs.forEach((doc) => {
    docsById.set(doc.id, doc)
  })

  snapshotByEnglishField.docs.forEach((doc) => {
    docsById.set(doc.id, doc)
  })

  await Promise.all(
    Array.from(docsById.values()).map((doc) => {
      return doc.ref.delete()
    }),
  )
}
