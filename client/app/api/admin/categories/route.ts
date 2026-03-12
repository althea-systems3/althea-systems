import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { validateNom, validateDescription, validateSlug } from '@/lib/categories/validation';
import { FIRESTORE_IMAGES_CATEGORIES } from '@/lib/categories/constants';
import type { Categorie } from '@/lib/supabase/types';

async function fetchAllCategories(): Promise<Categorie[] | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('categorie')
    .select('*')
    .order('ordre_affiche', { ascending: true });

  if (error) {
    console.error('Erreur chargement catégories admin', { error });
    return null;
  }

  return (data ?? []) as Categorie[];
}

async function countProductsByCategory(
  categoryId: string,
): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('produit_categorie')
    .select('*', { count: 'exact', head: true })
    .eq('id_categorie', categoryId);

  if (error) {
    console.error('Erreur comptage produits catégorie', { error });
    return 0;
  }

  return count ?? 0;
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
    image_url: imageUrl,
  });
}

export async function GET() {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const categories = await fetchAllCategories();

  if (!categories) {
    return NextResponse.json(
      { error: 'Erreur lors du chargement des catégories.' },
      { status: 500 },
    );
  }

  const categoriesWithCount = await Promise.all(
    categories.map(async (category) => {
      const productCount = await countProductsByCategory(category.id_categorie);
      return { ...category, nombre_produits: productCount };
    }),
  );

  return NextResponse.json({ categories: categoriesWithCount });
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
    await logAdminActivity(
      currentUser.user.id,
      'categories.create',
      { categoryId: category.id_categorie, nom: category.nom },
    );
  }

  return NextResponse.json({ category }, { status: 201 });
}
