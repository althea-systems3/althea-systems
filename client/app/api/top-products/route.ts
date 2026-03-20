import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_IMAGES_PRODUITS } from '@/lib/top-produits/constants';
import type { Produit } from '@/lib/supabase/types';

type HomeTopProductPayload = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number | null;
  displayOrder: number;
  isAvailable: boolean;
};

type FirestoreImageDoc = {
  produit_id: string;
  image_url: string;
};

const FALLBACK_HOME_TOP_PRODUCTS: HomeTopProductPayload[] = [
  {
    id: 'fallback-top-product-1',
    name: 'Interface Audio DSP-24',
    slug: 'interface-audio-dsp-24',
    imageUrl: '/carousel/pro-audio.svg',
    price: 649,
    displayOrder: 1,
    isAvailable: true,
  },
  {
    id: 'fallback-top-product-2',
    name: 'Switch Industriel Redondant',
    slug: 'switch-industriel-redondant',
    imageUrl: '/carousel/industrial-network.svg',
    price: 899,
    displayOrder: 2,
    isAvailable: true,
  },
  {
    id: 'fallback-top-product-3',
    name: 'Module Support Telemetrie',
    slug: 'module-support-telemetrie',
    imageUrl: '/carousel/smart-support.svg',
    price: 299,
    displayOrder: 3,
    isAvailable: false,
  },
];

function createFallbackResponse() {
  return NextResponse.json({
    products: FALLBACK_HOME_TOP_PRODUCTS,
    isFallbackData: true,
  });
}

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

async function fetchProductImages(
  productIds: string[],
): Promise<Map<string, FirestoreImageDoc>> {
  const imageMap = new Map<string, FirestoreImageDoc>();

  if (productIds.length === 0) {
    return imageMap;
  }

  try {
    const firestore = getFirestoreClient();

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_PRODUITS)
      .where('produit_id', 'in', productIds)
      .get();

    snapshot.docs.forEach((doc) => {
      const imageDoc = doc.data() as FirestoreImageDoc;
      imageMap.set(imageDoc.produit_id, imageDoc);
    });
  } catch (error) {
    console.error('Erreur chargement images Firestore produits', { error });
  }

  return imageMap;
}

function mapToPayload(
  product: Produit,
  fallbackOrder: number,
  imageDoc?: FirestoreImageDoc,
): HomeTopProductPayload {
  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    imageUrl: imageDoc?.image_url ?? null,
    price: Number.isFinite(Number(product.prix_ttc))
      ? Number(product.prix_ttc)
      : null,
    displayOrder: product.priorite ?? fallbackOrder,
    isAvailable: product.quantite_stock > 0,
  };
}

export async function GET() {
  try {
    if (!hasRequiredConfig()) {
      return createFallbackResponse();
    }

    const supabaseAdmin = createAdminClient();

    const { data: rawTopProducts, error } = await supabaseAdmin
      .from('produit')
      .select(
        'id_produit, nom, slug, prix_ttc, quantite_stock, priorite, statut, est_top_produit',
      )
      .eq('est_top_produit', true)
      .eq('statut', 'publie')
      .order('priorite', { ascending: true });

    if (error) {
      console.error('Erreur chargement top produits', { error });
      return createFallbackResponse();
    }

    const products = (rawTopProducts ?? []) as Produit[];

    if (products.length === 0) {
      return createFallbackResponse();
    }

    const productIds = products.map((p) => p.id_produit);
    const imageMap = await fetchProductImages(productIds);

    const payload = products.map((product, index) => {
      return mapToPayload(
        product,
        index + 1,
        imageMap.get(product.id_produit),
      );
    });

    return NextResponse.json({
      products: payload,
      isFallbackData: false,
    });
  } catch (error) {
    console.error('Erreur inattendue endpoint top produits', { error });
    return createFallbackResponse();
  }
}
