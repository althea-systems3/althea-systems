import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import {
  validateNom,
  validateDescription,
  validateSlug,
} from '@/lib/categories/validation';
import { FIRESTORE_IMAGES_CATEGORIES } from '@/lib/categories/constants';
import { fetchCategoryImagesByIds } from '@/lib/admin/categoryImages';
import type { Categorie, CategoryStatus } from '@/lib/supabase/types';

type CategorySortBy = 'nom' | 'nombre_produits' | 'ordre_affiche';
type CategorySortDirection = 'asc' | 'desc';
type CategoryStatusFilter = 'all' | CategoryStatus;

type CategoryListFilters = {
  search: string;
  status: CategoryStatusFilter;
  sortBy: CategorySortBy;
  sortDirection: CategorySortDirection;
};

type CategoryWithStats = Categorie & {
  nombre_produits: number;
};

const PRODUCT_COUNT_CHUNK_SIZE = 100;

function splitArrayIntoChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function parseStatusFilter(value: unknown): CategoryStatusFilter {
  if (value === 'active' || value === 'inactive') {
    return value;
  }

  return 'all';
}

function parseSortBy(value: unknown): CategorySortBy {
  if (
    value === 'nom' ||
    value === 'nombre_produits' ||
    value === 'ordre_affiche'
  ) {
    return value;
  }

  return 'ordre_affiche';
}

function parseSortDirection(value: unknown): CategorySortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

function buildQueryFilters(
  searchParams?: URLSearchParams,
): CategoryListFilters {
  return {
    search: normalizeString(searchParams?.get('search')),
    status: parseStatusFilter(searchParams?.get('status')),
    sortBy: parseSortBy(searchParams?.get('sortBy')),
    sortDirection: parseSortDirection(searchParams?.get('sortDirection')),
  };
}

function compareCategories(
  categoryA: CategoryWithStats,
  categoryB: CategoryWithStats,
  sortBy: CategorySortBy,
  sortDirection: CategorySortDirection,
): number {
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

  if (sortBy === 'ordre_affiche') {
    return (
      (categoryA.ordre_affiche - categoryB.ordre_affiche) * directionMultiplier
    );
  }

  if (sortBy === 'nombre_produits') {
    return (
      (categoryA.nombre_produits - categoryB.nombre_produits) *
      directionMultiplier
    );
  }

  return categoryA.nom.localeCompare(categoryB.nom, 'fr') * directionMultiplier;
}

async function fetchAllCategories(
  filters: CategoryListFilters,
): Promise<Categorie[] | null> {
  const supabase = createAdminClient();

  let query = supabase.from('categorie').select('*');

  if (filters.status !== 'all') {
    query = query.eq('statut', filters.status);
  }

  if (filters.search) {
    query = query.or(
      `nom.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }

  const { data, error } = await query.order('ordre_affiche', {
    ascending: true,
  });

  if (error) {
    console.error('Erreur chargement catégories admin', { error });
    return null;
  }

  return (data ?? []) as Categorie[];
}

async function countProductsByCategoryIds(
  categoryIds: string[],
): Promise<Map<string, number>> {
  const countsByCategoryId = new Map<string, number>();

  categoryIds.forEach((categoryId) => {
    countsByCategoryId.set(categoryId, 0);
  });

  if (categoryIds.length === 0) {
    return countsByCategoryId;
  }

  const supabase = createAdminClient();

  for (const categoryIdChunk of splitArrayIntoChunks(
    categoryIds,
    PRODUCT_COUNT_CHUNK_SIZE,
  )) {
    let chunkCounted = false;

    try {
      const { data, error } = await supabase
        .from('produit_categorie')
        .select('id_categorie')
        .in('id_categorie', categoryIdChunk);

      if (error) {
        console.error('Erreur comptage produits catégories', { error });
      } else {
        const links = (data ?? []) as Array<{ id_categorie: string }>;

        links.forEach((link) => {
          const currentCount = countsByCategoryId.get(link.id_categorie) ?? 0;
          countsByCategoryId.set(link.id_categorie, currentCount + 1);
        });

        chunkCounted = true;
      }
    } catch {
      chunkCounted = false;
    }

    if (chunkCounted) {
      continue;
    }

    for (const categoryId of categoryIdChunk) {
      const { count, error } = await supabase
        .from('produit_categorie')
        .select('id_categorie', { count: 'exact', head: true })
        .eq('id_categorie', categoryId);

      if (error) {
        console.error('Erreur comptage produits catégorie', {
          categoryId,
          error,
        });
        continue;
      }

      countsByCategoryId.set(categoryId, count ?? 0);
    }
  }

  return countsByCategoryId;
}

async function isSlugAlreadyUsed(slug: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('categorie')
    .select('id_categorie')
    .eq('slug', slug)
    .limit(1);

  return Array.isArray(data) && data.length > 0;
}

async function computeNextOrdreAffiche(): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('categorie')
    .select('ordre_affiche')
    .order('ordre_affiche', { ascending: false })
    .limit(1)
    .single();

  const lastCategory = data as { ordre_affiche: number } | null;
  return lastCategory ? lastCategory.ordre_affiche + 1 : 1;
}

async function createFirestoreImageDoc(
  categoryId: string,
  imageUrl: string,
): Promise<void> {
  const firestore = getFirestoreClient();

  await firestore.collection(FIRESTORE_IMAGES_CATEGORIES).add({
    categorie_id: categoryId,
    category_id: categoryId,
    image_url: imageUrl,
  });
}

export async function GET(request?: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const filters = buildQueryFilters(request?.nextUrl.searchParams);
  const categories = await fetchAllCategories(filters);

  if (!categories) {
    return NextResponse.json(
      { error: 'Erreur lors du chargement des catégories.' },
      { status: 500 },
    );
  }

  const categoryIds = categories.map((category) => category.id_categorie);

  const [productCountsByCategoryId, firestoreImagesByCategoryId] =
    await Promise.all([
      countProductsByCategoryIds(categoryIds),
      fetchCategoryImagesByIds(categoryIds),
    ]);

  const categoriesWithStats = categories.map((category) => {
    const productCount =
      productCountsByCategoryId.get(category.id_categorie) ?? 0;

    return {
      ...category,
      image_url:
        firestoreImagesByCategoryId.get(category.id_categorie) ??
        category.image_url ??
        null,
      nombre_produits: productCount,
    } satisfies CategoryWithStats;
  });

  const sortedCategories = [...categoriesWithStats].sort(
    (categoryA, categoryB) => {
      const comparedValue = compareCategories(
        categoryA,
        categoryB,
        filters.sortBy,
        filters.sortDirection,
      );

      if (comparedValue !== 0) {
        return comparedValue;
      }

      return categoryA.ordre_affiche - categoryB.ordre_affiche;
    },
  );

  return NextResponse.json({ categories: sortedCategories });
}

export async function POST(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json();

  const nomError = validateNom(body.nom);
  if (nomError) {
    return NextResponse.json({ error: nomError }, { status: 400 });
  }

  const slugError = validateSlug(body.slug);
  if (slugError) {
    return NextResponse.json({ error: slugError }, { status: 400 });
  }

  const descriptionError = validateDescription(body.description);
  if (descriptionError) {
    return NextResponse.json({ error: descriptionError }, { status: 400 });
  }

  const slugExists = await isSlugAlreadyUsed(body.slug);
  if (slugExists) {
    return NextResponse.json(
      { error: 'Ce slug est déjà utilisé par une autre catégorie.' },
      { status: 400 },
    );
  }

  const nextOrdre = await computeNextOrdreAffiche();
  const supabase = createAdminClient();

  const { data: newCategory, error: insertError } = await supabase
    .from('categorie')
    .insert({
      nom: body.nom.trim(),
      slug: body.slug.trim(),
      description: body.description ?? null,
      ordre_affiche: nextOrdre,
      statut: body.statut ?? 'active',
      image_url: body.image_url ?? null,
    } as never)
    .select()
    .single();

  if (insertError) {
    console.error('Erreur création catégorie', { insertError });
    return NextResponse.json(
      { error: 'Erreur lors de la création de la catégorie.' },
      { status: 500 },
    );
  }

  const category = newCategory as Categorie;

  try {
    await createFirestoreImageDoc(category.id_categorie, body.image_url ?? '');
  } catch (firestoreError) {
    console.error('Erreur création document Firestore', { firestoreError });
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(currentUser.user.id, 'categories.create', {
      categoryId: category.id_categorie,
      nom: category.nom,
    });
  }

  return NextResponse.json({ category }, { status: 201 });
}
