import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_IMAGES_PRODUITS } from '@/lib/top-produits/constants';
import { MAX_SIMILAR_PRODUCTS } from '@/lib/products/constants';
import type { Produit, ProduitCategorie } from '@/lib/supabase/types';

type SimilarProductPayload = {
  id: string;
  name: string;
  slug: string;
  priceTtc: number | null;
  isAvailable: boolean;
  imageUrl: string | null;
};

type FirestoreImageDoc = {
  produit_id: string;
  images: { url: string; est_principale: boolean }[];
};

const FIRESTORE_IN_QUERY_LIMIT = 30;

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function extractMainImageUrl(imageDoc: FirestoreImageDoc): string | null {
  const mainImage = imageDoc.images?.find((img) => img.est_principale);
  return mainImage?.url ?? imageDoc.images?.[0]?.url ?? null;
}

function splitIntoBatches(items: string[]): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < items.length; i += FIRESTORE_IN_QUERY_LIMIT) {
    batches.push(items.slice(i, i + FIRESTORE_IN_QUERY_LIMIT));
  }
  return batches;
}

async function fetchProductImages(
  productIds: string[],
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  if (productIds.length === 0) {
    return imageMap;
  }

  try {
    const firestore = getFirestoreClient();

    for (const batch of splitIntoBatches(productIds)) {
      const snapshot = await firestore
        .collection(FIRESTORE_IMAGES_PRODUITS)
        .where('produit_id', 'in', batch)
        .get();

      snapshot.docs.forEach((doc) => {
        const imageDoc = doc.data() as FirestoreImageDoc;
        const imageUrl = extractMainImageUrl(imageDoc);

        if (imageUrl) {
          imageMap.set(imageDoc.produit_id, imageUrl);
        }
      });
    }
  } catch (error) {
    console.error('Erreur chargement images Firestore similaires', { error });
  }

  return imageMap;
}

async function fetchCategoryIds(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  productId: string,
): Promise<string[]> {
  const { data: rawLinks, error } = await supabaseAdmin
    .from('produit_categorie')
    .select('id_categorie')
    .eq('id_produit', productId);

  if (error || !rawLinks) {
    return [];
  }

  const links = rawLinks as Pick<ProduitCategorie, 'id_categorie'>[];
  return links.map((link) => link.id_categorie);
}

async function fetchProductIdsByCategories(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  categoryIds: string[],
  excludeProductId: string,
): Promise<string[]> {
  const { data: rawLinks, error } = await supabaseAdmin
    .from('produit_categorie')
    .select('id_produit')
    .in('id_categorie', categoryIds);

  if (error || !rawLinks) {
    return [];
  }

  const links = rawLinks as Pick<ProduitCategorie, 'id_produit'>[];
  const uniqueProductIds = [...new Set(links.map((link) => link.id_produit))];

  return uniqueProductIds.filter(
    (productId) => productId !== excludeProductId,
  );
}

function sortByAvailabilityFirst(products: Produit[]): Produit[] {
  return [...products].sort((productA, productB) => {
    const isAvailableA = productA.quantite_stock > 0 ? 0 : 1;
    const isAvailableB = productB.quantite_stock > 0 ? 0 : 1;
    return isAvailableA - isAvailableB;
  });
}

function mapToSimilarPayload(
  product: Produit,
  imageUrl: string | null,
): SimilarProductPayload {
  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    priceTtc: product.prix_ttc ?? null,
    isAvailable: product.quantite_stock > 0,
    imageUrl,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!hasRequiredConfig()) {
    return NextResponse.json({ products: [] }, { status: 503 });
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data: rawProduct, error: productError } = await supabaseAdmin
      .from('produit')
      .select('id_produit')
      .eq('slug', slug)
      .eq('statut', 'publie')
      .single();

    if (productError || !rawProduct) {
      return NextResponse.json(
        { products: [], notFound: true },
        { status: 404 },
      );
    }

    const currentProduct = rawProduct as Pick<Produit, 'id_produit'>;
    const categoryIds = await fetchCategoryIds(
      supabaseAdmin,
      currentProduct.id_produit,
    );

    if (categoryIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const candidateProductIds = await fetchProductIdsByCategories(
      supabaseAdmin,
      categoryIds,
      currentProduct.id_produit,
    );

    if (candidateProductIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const { data: rawProducts, error: productsError } = await supabaseAdmin
      .from('produit')
      .select('id_produit, nom, slug, prix_ttc, quantite_stock, statut')
      .in('id_produit', candidateProductIds)
      .eq('statut', 'publie');

    if (productsError || !rawProducts) {
      return NextResponse.json({ products: [] }, { status: 500 });
    }

    const sortedProducts = sortByAvailabilityFirst(rawProducts as Produit[]);
    const limitedProducts = sortedProducts.slice(0, MAX_SIMILAR_PRODUCTS);

    const productIds = limitedProducts.map(
      (product) => product.id_produit,
    );
    const imageMap = await fetchProductImages(productIds);

    const payload = limitedProducts.map((product) =>
      mapToSimilarPayload(product, imageMap.get(product.id_produit) ?? null),
    );

    return NextResponse.json({ products: payload });
  } catch (error) {
    console.error('Erreur inattendue endpoint produits similaires', {
      slug,
      error,
    });
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
