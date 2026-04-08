import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_IMAGES_PRODUITS } from '@/lib/top-produits/constants';
import { computeProductRelevanceScore } from '@/lib/search/scoring';
import {
  DEFAULT_SEARCH_PAGE,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
} from '@/lib/search/constants';
import type { Produit, ProduitCategorie } from '@/lib/supabase/types';

const FIRESTORE_IN_QUERY_LIMIT = 30;

type SearchProductPayload = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceTtc: number | null;
  isAvailable: boolean;
  imageUrl: string | null;
  relevanceScore: number;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type FirestoreImageDoc = {
  produit_id: string;
  images: { url: string; est_principale: boolean }[];
};

type SearchParams = {
  query: string | null;
  priceMin: number | null;
  priceMax: number | null;
  categoryIds: string[];
  isAvailableOnly: boolean;
  sort: string;
  page: number;
  limit: number;
};

// --- Parsing ---

function parseSearchParams(searchParams: URLSearchParams): SearchParams {
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const rawLimit = parseInt(
    searchParams.get('limit') ?? String(DEFAULT_SEARCH_LIMIT),
    10,
  );

  const page = Number.isFinite(rawPage) && rawPage > 0
    ? rawPage
    : DEFAULT_SEARCH_PAGE;

  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_SEARCH_LIMIT)
    : DEFAULT_SEARCH_LIMIT;

  const rawPriceMin = searchParams.get('price_min');
  const rawPriceMax = searchParams.get('price_max');

  const priceMin = rawPriceMin !== null
    ? parseFloat(rawPriceMin)
    : null;

  const priceMax = rawPriceMax !== null
    ? parseFloat(rawPriceMax)
    : null;

  const rawCategories = searchParams.get('categories') ?? '';
  const categoryIds = rawCategories
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return {
    query: searchParams.get('q')?.trim() || null,
    priceMin: priceMin !== null && Number.isFinite(priceMin) ? priceMin : null,
    priceMax: priceMax !== null && Number.isFinite(priceMax) ? priceMax : null,
    categoryIds,
    isAvailableOnly: searchParams.get('available_only') === 'true',
    sort: searchParams.get('sort') ?? 'relevance',
    page,
    limit,
  };
}

// --- Images Firestore ---

function extractMainImageUrl(imageDoc: FirestoreImageDoc): string | null {
  const mainImage = imageDoc.images?.find((img) => img.est_principale);
  return mainImage?.url ?? imageDoc.images?.[0]?.url ?? null;
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

    for (let i = 0; i < productIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
      const batch = productIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT);

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
    console.error('Erreur chargement images Firestore recherche', { error });
  }

  return imageMap;
}

// --- Filtrage catégorie ---

async function fetchProductIdsByCategories(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  categoryIds: string[],
): Promise<Set<string>> {
  const { data: rawLinks, error } = await supabaseAdmin
    .from('produit_categorie')
    .select('id_produit')
    .in('id_categorie', categoryIds);

  if (error || !rawLinks) {
    return new Set();
  }

  const links = rawLinks as Pick<ProduitCategorie, 'id_produit'>[];
  return new Set(links.map((link) => link.id_produit));
}

// --- Recherche JSONB ---

function matchesJsonbSearch(
  characteristics: Record<string, unknown> | null,
  searchTerm: string,
): boolean {
  if (!characteristics) {
    return false;
  }

  const serialized = JSON.stringify(characteristics).toLowerCase();
  return serialized.includes(searchTerm.toLowerCase());
}

// --- Tri ---

type ScoredProduct = {
  product: Produit;
  relevanceScore: number;
};

function sortResults(
  scoredProducts: ScoredProduct[],
  sortOption: string,
): ScoredProduct[] {
  const sorted = [...scoredProducts];

  switch (sortOption) {
    case 'price_asc':
      sorted.sort(
        (itemA, itemB) => itemA.product.prix_ttc - itemB.product.prix_ttc,
      );
      break;

    case 'price_desc':
      sorted.sort(
        (itemA, itemB) => itemB.product.prix_ttc - itemA.product.prix_ttc,
      );
      break;

    case 'availability':
      sorted.sort((itemA, itemB) => {
        const isAvailableA = itemA.product.quantite_stock > 0 ? 0 : 1;
        const isAvailableB = itemB.product.quantite_stock > 0 ? 0 : 1;
        return isAvailableA - isAvailableB;
      });
      break;

    case 'relevance':
    default:
      sorted.sort((itemA, itemB) => {
        if (itemB.relevanceScore !== itemA.relevanceScore) {
          return itemB.relevanceScore - itemA.relevanceScore;
        }

        const isAvailableA = itemA.product.quantite_stock > 0 ? 0 : 1;
        const isAvailableB = itemB.product.quantite_stock > 0 ? 0 : 1;

        if (isAvailableA !== isAvailableB) {
          return isAvailableA - isAvailableB;
        }

        return itemB.product.priorite - itemA.product.priorite;
      });
      break;
  }

  return sorted;
}

// --- Mapping ---

function mapToSearchPayload(
  product: Produit,
  relevanceScore: number,
  imageUrl: string | null,
): SearchProductPayload {
  return {
    id: product.id_produit,
    name: product.nom,
    slug: product.slug,
    description: product.description,
    priceTtc: product.prix_ttc ?? null,
    isAvailable: product.quantite_stock > 0,
    imageUrl,
    relevanceScore,
  };
}

// --- Config ---

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

// --- Handler ---

export async function GET(request: Request) {
  if (!hasRequiredConfig()) {
    return NextResponse.json(
      { products: [], pagination: null },
      { status: 503 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const params = parseSearchParams(searchParams);

    const supabaseAdmin = createAdminClient();

    // NOTE: Récupère tous les produits publiés avec filtres SQL
    let supabaseQuery = supabaseAdmin
      .from('produit')
      .select(
        'id_produit, nom, description, caracteristique_tech, prix_ht, prix_ttc, quantite_stock, statut, slug, priorite, est_top_produit',
      )
      .eq('statut', 'publie');

    if (params.priceMin !== null) {
      supabaseQuery = supabaseQuery.gte('prix_ttc', params.priceMin);
    }

    if (params.priceMax !== null) {
      supabaseQuery = supabaseQuery.lte('prix_ttc', params.priceMax);
    }

    if (params.isAvailableOnly) {
      supabaseQuery = supabaseQuery.gt('quantite_stock', 0);
    }

    const { data: rawProducts, error } = await supabaseQuery;

    if (error) {
      console.error('Erreur recherche Supabase', { error });
      return NextResponse.json(
        { products: [], pagination: null },
        { status: 500 },
      );
    }

    let products = (rawProducts ?? []) as Produit[];

    // NOTE: Filtre par catégories côté JS après jointure
    if (params.categoryIds.length > 0) {
      const allowedProductIds = await fetchProductIdsByCategories(
        supabaseAdmin,
        params.categoryIds,
      );

      products = products.filter(
        (product) => allowedProductIds.has(product.id_produit),
      );
    }

    // NOTE: Scoring et filtrage texte
    let scoredProducts: ScoredProduct[];

    if (params.query) {
      const searchTerm = params.query;

      scoredProducts = products
        .map((product) => {
          const textScore = computeProductRelevanceScore(product, searchTerm);

          const hasJsonbMatch = matchesJsonbSearch(
            product.caracteristique_tech,
            searchTerm,
          );

          const relevanceScore = textScore > 0
            ? textScore
            : hasJsonbMatch ? 50 : 0;

          return { product, relevanceScore };
        })
        .filter((item) => item.relevanceScore > 0);
    } else {
      scoredProducts = products.map((product) => ({
        product,
        relevanceScore: 0,
      }));
    }

    // NOTE: Tri selon le paramètre demandé
    const sorted = sortResults(scoredProducts, params.sort);

    // NOTE: Pagination
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit);
    const safePage = Math.min(params.page, Math.max(totalPages, 1));
    const offset = (safePage - 1) * params.limit;
    const paginated = sorted.slice(offset, offset + params.limit);

    // NOTE: Images Firestore pour les produits paginés uniquement
    const paginatedIds = paginated.map((item) => item.product.id_produit);
    const imageMap = await fetchProductImages(paginatedIds);

    const pagination: PaginationMeta = {
      page: safePage,
      limit: params.limit,
      total,
      totalPages,
    };

    const payload = paginated.map((item) =>
      mapToSearchPayload(
        item.product,
        item.relevanceScore,
        imageMap.get(item.product.id_produit) ?? null,
      ),
    );

    return NextResponse.json({ products: payload, pagination });
  } catch (error) {
    console.error('Erreur inattendue endpoint recherche', { error });
    return NextResponse.json(
      { products: [], pagination: null },
      { status: 500 },
    );
  }
}
