import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseAdmin = createAdminClient();

  const { data: activeCategories, error: categoriesError } = await supabaseAdmin
    .from('categorie')
    .select('nom, slug, ordre_affiche, image_url')
    .eq('statut', 'active')
    .order('ordre_affiche', { ascending: true });

  if (categoriesError) {
    console.error('Erreur chargement catégories menu', { categoriesError });
    return NextResponse.json(
      { error: 'Impossible de charger les catégories.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { categories: activeCategories },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
