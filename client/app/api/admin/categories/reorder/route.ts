import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';

type ReorderItem = { id: string; ordre_affiche: number };

function validateReorderItems(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return 'La liste des catégories est requise.';
  }

  const ordres = new Set<number>();

  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') {
      return 'Chaque catégorie doit avoir un id valide.';
    }

    if (!Number.isInteger(item.ordre_affiche) || item.ordre_affiche < 1) {
      return 'L ordre doit être un entier positif.';
    }

    if (ordres.has(item.ordre_affiche)) {
      return 'Les ordres ne doivent pas contenir de doublons.';
    }

    ordres.add(item.ordre_affiche);
  }

  return null;
}

async function verifyAllCategoriesExist(
  categoryIds: string[],
): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('categorie')
    .select('*', { count: 'exact', head: true })
    .in('id_categorie', categoryIds);

  if (error) {
    return false;
  }

  return count === categoryIds.length;
}

async function updateCategoryOrdre(
  categoryId: string,
  newOrdre: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('categorie')
    .update({ ordre_affiche: newOrdre } as never)
    .eq('id_categorie', categoryId);

  return !error;
}

export async function PATCH(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const { categories } = body;

  const validationError = validateReorderItems(categories);
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 },
    );
  }

  const reorderItems = categories as ReorderItem[];
  const categoryIds = reorderItems.map((item) => item.id);

  const allExist = await verifyAllCategoriesExist(categoryIds);
  if (!allExist) {
    return NextResponse.json(
      { error: 'Une ou plusieurs catégories introuvables.' },
      { status: 404 },
    );
  }

  const updateResults = await Promise.all(
    reorderItems.map((item) =>
      updateCategoryOrdre(item.id, item.ordre_affiche),
    ),
  );

  const hasFailure = updateResults.some((isSuccess) => !isSuccess);
  if (hasFailure) {
    return NextResponse.json(
      { error: 'Erreur lors de la réorganisation.' },
      { status: 500 },
    );
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'categories.reorder',
      {
        categoryIds,
        newOrder: reorderItems.map((item) => item.ordre_affiche),
      },
    );
  }

  return NextResponse.json({ success: true });
}
