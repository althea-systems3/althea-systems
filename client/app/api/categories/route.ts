import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_IMAGES_CATEGORIES } from '@/lib/categories/constants';
import type { Categorie } from '@/lib/supabase/types';

type HomeCategoryPayload = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

type FirestoreImageDoc = {
  categorie_id: string;
  image_url: string;
};

const FALLBACK_HOME_CATEGORIES: HomeCategoryPayload[] = [
  {
    id: 'fallback-category-audio',
    name: 'Audio Pro',
    slug: 'audio-pro',
    imageUrl: '/carousel/pro-audio.svg',
  },
  {
    id: 'fallback-category-reseau',
    name: 'Reseaux Industriels',
    slug: 'reseaux-industriels',
    imageUrl: '/carousel/industrial-network.svg',
  },
  {
    id: 'fallback-category-support',
    name: 'Support Technique',
    slug: 'support-technique',
    imageUrl: '/carousel/smart-support.svg',
  },
  {
    id: 'fallback-category-automatismes',
    name: 'Automatismes',
    slug: 'automatismes',
    imageUrl: null,
  },
];

function createFallbackResponse() {
  return NextResponse.json({
    categories: FALLBACK_HOME_CATEGORIES,
    isFallbackData: true,
  });
}

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

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
    console.error('Erreur chargement images Firestore catégories', { error });
  }

  return imageMap;
}

function mapToPayload(
  category: Categorie,
  imageDoc?: FirestoreImageDoc,
): HomeCategoryPayload {
  return {
    id: category.id_categorie,
    name: category.nom,
    slug: category.slug,
    imageUrl: imageDoc?.image_url ?? category.image_url,
  };
}

export async function GET() {
  try {
    if (!hasRequiredConfig()) {
      return createFallbackResponse();
    }

    const supabaseAdmin = createAdminClient();

    const { data: rawCategories, error } = await supabaseAdmin
      .from('categorie')
      .select('id_categorie, nom, slug, image_url, ordre_affiche, statut')
      .eq('statut', 'active')
      .order('ordre_affiche', { ascending: true });

    if (error) {
      console.error('Erreur chargement catégories', { error });
      return createFallbackResponse();
    }

    const categories = (rawCategories ?? []) as Categorie[];

    if (categories.length === 0) {
      return createFallbackResponse();
    }

    const categoryIds = categories.map((c) => c.id_categorie);
    const imageMap = await fetchCategoryImages(categoryIds);

    const payload = categories.map((category) => {
      return mapToPayload(category, imageMap.get(category.id_categorie));
    });

    return NextResponse.json({
      categories: payload,
      isFallbackData: false,
    });
  } catch (error) {
    console.error('Erreur inattendue endpoint catégories', { error });
    return createFallbackResponse();
  }
}
