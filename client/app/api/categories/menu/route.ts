import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_IMAGES_CATEGORIES } from '@/lib/categories/constants';

export const dynamic = 'force-dynamic';

type FirestoreImageDoc = {
  categorie_id: string;
  image_url: string;
};

type MenuCategory = {
  nom: string;
  slug: string;
  ordre_affiche: number;
  image_url: string | null;
};

async function fetchCategoryImages(
  categoryIds: string[],
): Promise<Map<string, FirestoreImageDoc>> {
  const imageMap = new Map<string, FirestoreImageDoc>();

  if (categoryIds.length === 0) {
    return imageMap;
  }

  try {
    const firestore = getFirestoreClient();

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_CATEGORIES)
      .where('categorie_id', 'in', categoryIds)
      .get();

    snapshot.docs.forEach((doc) => {
      const imageDoc = doc.data() as FirestoreImageDoc;
      imageMap.set(imageDoc.categorie_id, imageDoc);
    });
  } catch (error) {
    console.error('Erreur chargement images Firestore catégories menu', { error });
  }

  return imageMap;
}

export async function GET() {
  const supabaseAdmin = createAdminClient();

  const { data: activeCategories, error: categoriesError } = await supabaseAdmin
    .from('categorie')
    .select('id_categorie, nom, slug, ordre_affiche, image_url')
    .eq('statut', 'active')
    .order('ordre_affiche', { ascending: true });

  if (categoriesError) {
    console.error('Erreur chargement catégories menu', { categoriesError });
    return NextResponse.json(
      { error: 'Impossible de charger les catégories.' },
      { status: 500 },
    );
  }

  const categories = (activeCategories ?? []) as (MenuCategory & { id_categorie: string })[];
  const categoryIds = categories.map((c) => c.id_categorie);
  const imageMap = await fetchCategoryImages(categoryIds);

  // NOTE: Enrichir image_url avec Firestore, fallback sur Supabase
  const enrichedCategories = categories.map((category) => {
    const imageDoc = imageMap.get(category.id_categorie);
    return {
      nom: category.nom,
      slug: category.slug,
      ordre_affiche: category.ordre_affiche,
      image_url: imageDoc?.image_url ?? category.image_url,
    };
  });

  return NextResponse.json(
    { categories: enrichedCategories },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    },
  );
}
