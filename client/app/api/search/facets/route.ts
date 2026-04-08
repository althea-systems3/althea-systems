import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Categorie } from '@/lib/supabase/types';

type CategoryFacet = {
  id: string;
  name: string;
  slug: string;
};

type PriceRange = {
  min: number;
  max: number;
};

type SortOption = {
  value: string;
  label: string;
};

const AVAILABLE_SORT_OPTIONS: SortOption[] = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'availability', label: 'Disponibilité' },
];

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

async function fetchActiveCategories(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
): Promise<CategoryFacet[]> {
  const { data, error } = await supabaseAdmin
    .from('categorie')
    .select('id_categorie, nom, slug')
    .eq('statut', 'active')
    .order('ordre_affiche', { ascending: true });

  if (error || !data) {
    return [];
  }

  const categories = data as Pick<Categorie, 'id_categorie' | 'nom' | 'slug'>[];

  return categories.map((category) => ({
    id: category.id_categorie,
    name: category.nom,
    slug: category.slug,
  }));
}

async function fetchPriceRange(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
): Promise<PriceRange | null> {
  const { data: minResult, error: minError } = await supabaseAdmin
    .from('produit')
    .select('prix_ttc')
    .eq('statut', 'publie')
    .order('prix_ttc', { ascending: true })
    .limit(1)
    .single();

  const { data: maxResult, error: maxError } = await supabaseAdmin
    .from('produit')
    .select('prix_ttc')
    .eq('statut', 'publie')
    .order('prix_ttc', { ascending: false })
    .limit(1)
    .single();

  if (minError || maxError || !minResult || !maxResult) {
    return null;
  }

  return {
    min: Number((minResult as { prix_ttc: number }).prix_ttc),
    max: Number((maxResult as { prix_ttc: number }).prix_ttc),
  };
}

export async function GET() {
  if (!hasRequiredConfig()) {
    return NextResponse.json(
      { categories: [], priceRange: null, sortOptions: AVAILABLE_SORT_OPTIONS },
      { status: 503 },
    );
  }

  try {
    const supabaseAdmin = createAdminClient();

    const [categories, priceRange] = await Promise.all([
      fetchActiveCategories(supabaseAdmin),
      fetchPriceRange(supabaseAdmin),
    ]);

    return NextResponse.json({
      categories,
      priceRange,
      sortOptions: AVAILABLE_SORT_OPTIONS,
    });
  } catch (error) {
    console.error('Erreur inattendue endpoint facettes recherche', { error });
    return NextResponse.json(
      { categories: [], priceRange: null, sortOptions: AVAILABLE_SORT_OPTIONS },
      { status: 500 },
    );
  }
}
