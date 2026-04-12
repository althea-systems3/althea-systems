import { NextRequest, NextResponse } from 'next/server';

import {
  extractMainImageUrl,
  fetchProductImagesByIds,
} from '@/lib/admin/productImages';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import {
  normalizeString,
  parseFiniteNumber,
  slugify,
  toOptionalString,
} from '@/lib/admin/common';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { createAdminClient } from '@/lib/supabase/admin';

type ProductStatus = 'publie' | 'brouillon';
type ProductAvailability = 'all' | 'in_stock' | 'out_of_stock';
type ProductSortBy =
  | 'nom'
  | 'prix_ht'
  | 'prix_ttc'
  | 'quantite_stock'
  | 'statut'
  | 'date_creation';
type ProductSortDirection = 'asc' | 'desc';

type ProductCreatePayload = {
  nom?: unknown;
  description?: unknown;
  prix_ht?: unknown;
  prix_ttc?: unknown;
  tva?: unknown;
  quantite_stock?: unknown;
  statut?: unknown;
  slug?: unknown;
  categoryIds?: unknown;
  caracteristique_tech?: unknown;
};

type ProductListFilters = {
  search: string;
  status: 'all' | ProductStatus;
  categoryId: string;
  availability: ProductAvailability;
  createdFrom: Date | null;
  createdTo: Date | null;
  priceMin: number | null;
  priceMax: number | null;
  sortBy: ProductSortBy;
  sortDirection: ProductSortDirection;
  page: number;
  pageSize: number;
};

type ProductRow = {
  id_produit: string;
  nom: string;
  description: string | null;
  caracteristique_tech: Record<string, unknown> | null;
  prix_ht: number;
  tva: string;
  prix_ttc: number;
  quantite_stock: number;
  statut: ProductStatus;
  slug: string;
  [key: string]: unknown;
};

type ProductCategoryLink = {
  id_produit: string;
  id_categorie: string;
};

type CategoryRow = {
  id_categorie: string;
  nom: string;
};

type ProductWithDerivedFields = ProductRow & {
  createdAt: string | null;
  createdAtTimestamp: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

const ALLOWED_TVA_VALUES = new Set(['20', '10', '5.5', '0']);

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseStatus(value: unknown): ProductStatus {
  return value === 'publie' ? 'publie' : 'brouillon';
}

function parseTva(value: unknown, fallbackValue = '20'): string {
  const normalizedValue = normalizeString(value);

  if (ALLOWED_TVA_VALUES.has(normalizedValue)) {
    return normalizedValue;
  }

  return fallbackValue;
}

function parseCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => normalizeString(item)).filter(Boolean)),
  );
}

function parseIntegerParam(
  value: string | null,
  fallbackValue: number,
): number {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
}

function parseNumberParam(value: string | null): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number.parseFloat(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function parseDateParam(value: string | null, endOfDay: boolean): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return parsedDate;
}

function parseSortBy(value: string | null): ProductSortBy {
  if (
    value === 'nom' ||
    value === 'prix_ht' ||
    value === 'prix_ttc' ||
    value === 'quantite_stock' ||
    value === 'statut' ||
    value === 'date_creation'
  ) {
    return value;
  }

  return 'nom';
}

function parseSortDirection(value: string | null): ProductSortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

function parseAvailability(value: string | null): ProductAvailability {
  if (value === 'in_stock' || value === 'out_of_stock') {
    return value;
  }

  return 'all';
}

function buildQueryFilters(searchParams: URLSearchParams): ProductListFilters {
  const page = parseIntegerParam(searchParams.get('page'), DEFAULT_PAGE);
  const rawPageSize = parseIntegerParam(
    searchParams.get('pageSize'),
    DEFAULT_PAGE_SIZE,
  );

  return {
    search: normalizeString(searchParams.get('search')),
    status:
      searchParams.get('status') === 'publie'
        ? 'publie'
        : searchParams.get('status') === 'brouillon'
          ? 'brouillon'
          : 'all',
    categoryId: normalizeString(searchParams.get('categoryId')),
    availability: parseAvailability(searchParams.get('availability')),
    createdFrom: parseDateParam(searchParams.get('createdFrom'), false),
    createdTo: parseDateParam(searchParams.get('createdTo'), true),
    priceMin: parseNumberParam(searchParams.get('priceMin')),
    priceMax: parseNumberParam(searchParams.get('priceMax')),
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortDirection: parseSortDirection(searchParams.get('sortDirection')),
    page,
    pageSize: Math.min(rawPageSize, MAX_PAGE_SIZE),
  };
}

function computeVatRate(tva: string): number {
  return Number.parseFloat(tva.replace(',', '.'));
}

function computePrices(
  priceHtInput: number | null,
  priceTtcInput: number | null,
  tva: string,
): {
  priceHt: number;
  priceTtc: number;
} | null {
  const vatRate = computeVatRate(tva);

  if (!Number.isFinite(vatRate) || vatRate < 0) {
    return null;
  }

  const vatMultiplier = 1 + vatRate / 100;

  if (priceHtInput !== null) {
    if (priceHtInput < 0) {
      return null;
    }

    const priceHt = roundToTwoDecimals(priceHtInput);
    return {
      priceHt,
      priceTtc: roundToTwoDecimals(priceHt * vatMultiplier),
    };
  }

  if (priceTtcInput !== null) {
    if (priceTtcInput < 0) {
      return null;
    }

    const priceTtc = roundToTwoDecimals(priceTtcInput);
    return {
      priceHt: roundToTwoDecimals(priceTtc / vatMultiplier),
      priceTtc,
    };
  }

  return null;
}

function parseTechnicalCharacteristics(value: unknown): {
  technicalCharacteristics: Record<string, unknown> | null;
  hasInvalidFormat: boolean;
} {
  if (value === null || value === undefined) {
    return {
      technicalCharacteristics: null,
      hasInvalidFormat: false,
    };
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return {
        technicalCharacteristics: null,
        hasInvalidFormat: false,
      };
    }

    try {
      const parsedValue = JSON.parse(normalizedValue) as unknown;

      if (
        parsedValue &&
        typeof parsedValue === 'object' &&
        !Array.isArray(parsedValue)
      ) {
        return {
          technicalCharacteristics: parsedValue as Record<string, unknown>,
          hasInvalidFormat: false,
        };
      }

      return {
        technicalCharacteristics: null,
        hasInvalidFormat: true,
      };
    } catch {
      return {
        technicalCharacteristics: null,
        hasInvalidFormat: true,
      };
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return {
      technicalCharacteristics: value as Record<string, unknown>,
      hasInvalidFormat: false,
    };
  }

  return {
    technicalCharacteristics: null,
    hasInvalidFormat: true,
  };
}

async function getFilteredProductIdsByCategory(
  categoryId: string,
): Promise<Set<string>> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('produit_categorie')
    .select('id_produit')
    .eq('id_categorie', categoryId);

  if (error || !data) {
    return new Set();
  }

  return new Set(
    (data as Array<{ id_produit: string }>).map((row) => row.id_produit),
  );
}

function extractProductCreatedAt(rawProduct: ProductRow): string | null {
  const dateCreationField = rawProduct.date_creation;

  if (
    typeof dateCreationField === 'string' &&
    !Number.isNaN(new Date(dateCreationField).getTime())
  ) {
    return dateCreationField;
  }

  const createdAtField = rawProduct.created_at;

  if (
    typeof createdAtField === 'string' &&
    !Number.isNaN(new Date(createdAtField).getTime())
  ) {
    return createdAtField;
  }

  return null;
}

function mapToProductWithDerivedFields(
  rawProduct: ProductRow,
): ProductWithDerivedFields {
  const createdAt = extractProductCreatedAt(rawProduct);

  return {
    ...rawProduct,
    createdAt,
    createdAtTimestamp: createdAt ? new Date(createdAt).getTime() : 0,
  };
}

function applyInMemoryDateFilters(
  products: ProductWithDerivedFields[],
  filters: ProductListFilters,
): ProductWithDerivedFields[] {
  if (!filters.createdFrom && !filters.createdTo) {
    return products;
  }

  return products.filter((product) => {
    if (!product.createdAt) {
      return false;
    }

    const productTimestamp = new Date(product.createdAt).getTime();

    if (
      filters.createdFrom &&
      productTimestamp < filters.createdFrom.getTime()
    ) {
      return false;
    }

    if (filters.createdTo && productTimestamp > filters.createdTo.getTime()) {
      return false;
    }

    return true;
  });
}

function compareProducts(
  productA: ProductWithDerivedFields,
  productB: ProductWithDerivedFields,
  sortBy: ProductSortBy,
  sortDirection: ProductSortDirection,
): number {
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

  if (sortBy === 'prix_ht') {
    return (productA.prix_ht - productB.prix_ht) * directionMultiplier;
  }

  if (sortBy === 'prix_ttc') {
    return (productA.prix_ttc - productB.prix_ttc) * directionMultiplier;
  }

  if (sortBy === 'quantite_stock') {
    return (
      (productA.quantite_stock - productB.quantite_stock) * directionMultiplier
    );
  }

  if (sortBy === 'statut') {
    return productA.statut.localeCompare(productB.statut) * directionMultiplier;
  }

  if (sortBy === 'date_creation') {
    return (
      (productA.createdAtTimestamp - productB.createdAtTimestamp) *
      directionMultiplier
    );
  }

  return productA.nom.localeCompare(productB.nom, 'fr') * directionMultiplier;
}

async function ensureSlugIsAvailable(slug: string): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('produit')
    .select('id_produit')
    .eq('slug', slug)
    .limit(1);

  if (error) {
    return false;
  }

  return !Array.isArray(data) || data.length === 0;
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const filters = buildQueryFilters(request.nextUrl.searchParams);
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin.from('produit').select('*');

    if (filters.status === 'publie' || filters.status === 'brouillon') {
      query = query.eq('statut', filters.status);
    }

    if (filters.search) {
      query = query.or(
        `nom.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }

    if (filters.availability === 'in_stock') {
      query = query.gt('quantite_stock', 0);
    }

    if (filters.availability === 'out_of_stock') {
      query = query.lte('quantite_stock', 0);
    }

    if (filters.priceMin !== null) {
      query = query.gte('prix_ttc', filters.priceMin);
    }

    if (filters.priceMax !== null) {
      query = query.lte('prix_ttc', filters.priceMax);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur chargement produits admin', { error });

      return NextResponse.json(
        {
          error: 'Erreur lors du chargement des produits.',
          code: 'admin_products_read_failed',
        },
        { status: 500 },
      );
    }

    const rawProducts = (data as ProductRow[] | null) ?? [];

    let filteredProducts = rawProducts;

    if (filters.categoryId) {
      const productIds = await getFilteredProductIdsByCategory(
        filters.categoryId,
      );
      filteredProducts = filteredProducts.filter((product) =>
        productIds.has(product.id_produit),
      );
    }

    const productsWithDerivedFields = filteredProducts.map(
      mapToProductWithDerivedFields,
    );

    const dateFilteredProducts = applyInMemoryDateFilters(
      productsWithDerivedFields,
      filters,
    );

    const sortedProducts = [...dateFilteredProducts].sort(
      (productA, productB) => {
        const mainSortValue = compareProducts(
          productA,
          productB,
          filters.sortBy,
          filters.sortDirection,
        );

        if (mainSortValue !== 0) {
          return mainSortValue;
        }

        return productA.nom.localeCompare(productB.nom, 'fr');
      },
    );

    const totalItems = sortedProducts.length;
    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / filters.pageSize);
    const safePage = Math.min(filters.page, Math.max(totalPages, 1));
    const offset = (safePage - 1) * filters.pageSize;
    const paginatedProducts = sortedProducts.slice(
      offset,
      offset + filters.pageSize,
    );
    const paginatedProductIds = paginatedProducts.map(
      (product) => product.id_produit,
    );

    const [categoryLinksResult, categoriesResult, productImagesMap] =
      await Promise.all([
        paginatedProductIds.length > 0
          ? supabaseAdmin
              .from('produit_categorie')
              .select('id_produit, id_categorie')
              .in('id_produit', paginatedProductIds)
          : Promise.resolve({ data: [], error: null }),
        supabaseAdmin
          .from('categorie')
          .select('id_categorie, nom')
          .order('nom', { ascending: true }),
        fetchProductImagesByIds(paginatedProductIds),
      ]);

    const categoryLinks =
      (categoryLinksResult.data as ProductCategoryLink[] | null) ?? [];
    const categories = (categoriesResult.data as CategoryRow[] | null) ?? [];

    const categoriesById = new Map(
      categories.map((category) => [category.id_categorie, category]),
    );

    const categoryIdsByProductId = new Map<string, string[]>();

    categoryLinks.forEach((categoryLink) => {
      const productCategoryIds =
        categoryIdsByProductId.get(categoryLink.id_produit) ?? [];

      productCategoryIds.push(categoryLink.id_categorie);
      categoryIdsByProductId.set(categoryLink.id_produit, productCategoryIds);
    });

    const products = paginatedProducts.map((product) => {
      const productCategoryIds =
        categoryIdsByProductId.get(product.id_produit) ?? [];
      const productImages = productImagesMap.get(product.id_produit) ?? [];

      return {
        id_produit: product.id_produit,
        nom: product.nom,
        description: product.description,
        caracteristique_tech: product.caracteristique_tech ?? null,
        prix_ht: roundToTwoDecimals(Number(product.prix_ht ?? 0)),
        tva: parseTva(product.tva),
        prix_ttc: roundToTwoDecimals(Number(product.prix_ttc ?? 0)),
        quantite_stock: product.quantite_stock,
        statut: product.statut,
        slug: product.slug,
        date_creation: product.createdAt,
        image_principale_url: extractMainImageUrl(productImages),
        categories: productCategoryIds
          .map((categoryId) => categoriesById.get(categoryId))
          .filter((category): category is CategoryRow => Boolean(category)),
      };
    });

    return NextResponse.json({
      products,
      categories,
      pagination: {
        page: safePage,
        pageSize: filters.pageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue produits admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const body = (await request
      .json()
      .catch(() => null)) as ProductCreatePayload | null;

    const name = normalizeString(body?.nom);
    const description = toOptionalString(body?.description);
    const tva = parseTva(body?.tva);
    const priceHtInput = parseFiniteNumber(body?.prix_ht);
    const priceTtcInput = parseFiniteNumber(body?.prix_ttc);
    const stockQuantity = parseFiniteNumber(body?.quantite_stock);
    const status = parseStatus(body?.statut);
    const customSlug = normalizeString(body?.slug);
    const categoryIds = parseCategoryIds(body?.categoryIds);
    const technicalCharacteristicsResult = parseTechnicalCharacteristics(
      body?.caracteristique_tech,
    );

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom produit est obligatoire.', code: 'name_required' },
        { status: 400 },
      );
    }

    if (technicalCharacteristicsResult.hasInvalidFormat) {
      return NextResponse.json(
        {
          error:
            'Les caractéristiques techniques doivent être un objet JSON valide.',
          code: 'technical_characteristics_invalid',
        },
        { status: 400 },
      );
    }

    const computedPrices = computePrices(priceHtInput, priceTtcInput, tva);

    if (!computedPrices) {
      return NextResponse.json(
        {
          error: 'Le prix HT ou le prix TTC doit être un nombre positif.',
          code: 'price_invalid',
        },
        { status: 400 },
      );
    }

    if (stockQuantity === null || stockQuantity < 0) {
      return NextResponse.json(
        {
          error: 'Le stock doit être un entier positif.',
          code: 'stock_invalid',
        },
        { status: 400 },
      );
    }

    const slug = customSlug || slugify(name);

    if (!slug) {
      return NextResponse.json(
        {
          error: 'Impossible de générer un slug valide.',
          code: 'slug_invalid',
        },
        { status: 400 },
      );
    }

    const isSlugAvailable = await ensureSlugIsAvailable(slug);

    if (!isSlugAvailable) {
      return NextResponse.json(
        {
          error: 'Ce slug est déjà utilisé par un autre produit.',
          code: 'slug_already_used',
        },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('produit')
      .insert({
        nom: name,
        description,
        caracteristique_tech:
          technicalCharacteristicsResult.technicalCharacteristics,
        prix_ht: computedPrices.priceHt,
        tva,
        prix_ttc: computedPrices.priceTtc,
        quantite_stock: Math.round(stockQuantity),
        statut: status,
        slug,
        priorite: 0,
        est_top_produit: false,
      } as never)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erreur creation produit admin', { error });

      return NextResponse.json(
        {
          error: 'Erreur lors de la création du produit.',
          code: 'admin_product_create_failed',
        },
        { status: 500 },
      );
    }

    const createdProduct = data as ProductRow;

    if (categoryIds.length > 0) {
      const linkRows = categoryIds.map((categoryId) => ({
        id_produit: createdProduct.id_produit,
        id_categorie: categoryId,
      }));

      const { error: linkError } = await supabaseAdmin
        .from('produit_categorie')
        .insert(linkRows as never);

      if (linkError) {
        console.error('Erreur liaison categories produit', { linkError });
      }
    }

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'products.create', {
        productId: createdProduct.id_produit,
        name: createdProduct.nom,
        slug: createdProduct.slug,
      });
    }

    return NextResponse.json(
      {
        product: {
          ...createdProduct,
          tva: parseTva(createdProduct.tva),
          prix_ht: roundToTwoDecimals(Number(createdProduct.prix_ht ?? 0)),
          prix_ttc: roundToTwoDecimals(Number(createdProduct.prix_ttc ?? 0)),
          date_creation: extractProductCreatedAt(createdProduct),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Erreur inattendue creation produit admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}
