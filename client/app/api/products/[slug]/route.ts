import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_IMAGES_PRODUITS } from '@/lib/top-produits/constants';
import {
  getRequestLocale,
  pickLocalizedRecord,
  pickLocalizedString,
} from '@/lib/translation/pickLocalized';
import type { AppLocale } from '@/lib/i18n';
import type { Produit } from '@/lib/supabase/types';

type ProductImagePayload = {
  url: string;
  ordre: number;
  isMain: boolean;
  altText: string | null;
};

type ProductDetailPayload = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceHt: number;
  tva: string;
  priceTtc: number;
  stockQuantity: number;
  isAvailable: boolean;
  characteristics: Record<string, unknown> | null;
  images: ProductImagePayload[];
};

type FirestoreProductImage = {
  url: string;
  ordre: number;
  est_principale: boolean;
  alt_text?: string;
};

type FirestoreImageDoc = {
  produit_id: string;
  images: FirestoreProductImage[];
};

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

async function fetchProductImagesByProductId(
  productId: string,
): Promise<ProductImagePayload[]> {
  try {
    const firestore = getFirestoreClient();

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_PRODUITS)
      .where('produit_id', '==', productId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return [];
    }

    const imageDoc = snapshot.docs[0].data() as FirestoreImageDoc;
    const rawImages = imageDoc.images ?? [];

    return rawImages
      .sort((imageA, imageB) => imageA.ordre - imageB.ordre)
      .map((image) => ({
        url: image.url,
        ordre: image.ordre,
        isMain: image.est_principale,
        altText: image.alt_text ?? null,
      }));
  } catch (error) {
    console.error('Erreur chargement images Firestore produit', {
      productId,
      error,
    });
    return [];
  }
}

function mapToDetailPayload(
  product: Produit,
  images: ProductImagePayload[],
  locale: AppLocale,
): ProductDetailPayload {
  return {
    id: product.id_produit,
    name: pickLocalizedString(product, 'nom', locale, product.nom),
    slug: product.slug,
    description: pickLocalizedString(
      product,
      'description',
      locale,
      product.description,
    ),
    priceHt: product.prix_ht,
    tva: product.tva,
    priceTtc: product.prix_ttc,
    stockQuantity: product.quantite_stock,
    isAvailable: product.quantite_stock > 0,
    characteristics: pickLocalizedRecord(
      product,
      'caracteristique_tech',
      locale,
      (product.caracteristique_tech as Record<string, string> | null) ?? null,
    ),
    images,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const locale = getRequestLocale(request);

  if (!hasRequiredConfig()) {
    return NextResponse.json(
      { product: null },
      { status: 503 },
    );
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data: rawProduct, error } = await supabaseAdmin
      .from('produit')
      .select('*')
      .eq('slug', slug)
      .eq('statut', 'publie')
      .single();

    if (error || !rawProduct) {
      return NextResponse.json(
        { product: null, notFound: true },
        { status: 404 },
      );
    }

    const product = rawProduct as Produit;
    const images = await fetchProductImagesByProductId(product.id_produit);

    return NextResponse.json({
      product: mapToDetailPayload(product, images, locale),
    });
  } catch (error) {
    console.error('Erreur inattendue endpoint détail produit', {
      slug,
      error,
    });
    return NextResponse.json(
      { product: null },
      { status: 500 },
    );
  }
}
