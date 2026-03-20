import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';

type ReorderItem = { id: string; priorite: number };

function validateReorderItems(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return 'La liste des produits est requise.';
  }

  const priorites = new Set<number>();

  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') {
      return 'Chaque produit doit avoir un id valide.';
    }

    if (!Number.isInteger(item.priorite) || item.priorite < 1) {
      return 'La priorité doit être un entier positif.';
    }

    if (priorites.has(item.priorite)) {
      return 'Les priorités ne doivent pas contenir de doublons.';
    }

    priorites.add(item.priorite);
  }

  return null;
}

async function verifyAllProduitsAreTop(
  productIds: string[],
): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('produit')
    .select('*', { count: 'exact', head: true })
    .eq('est_top_produit', true)
    .in('id_produit', productIds);

  if (error) {
    return false;
  }

  return count === productIds.length;
}

async function updateProduitPriorite(
  productId: string,
  newPriorite: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('produit')
    .update({ priorite: newPriorite } as never)
    .eq('id_produit', productId);

  return !error;
}

export async function PATCH(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const { produits } = body;

  const validationError = validateReorderItems(produits);
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 },
    );
  }

  const reorderItems = produits as ReorderItem[];
  const productIds = reorderItems.map((item) => item.id);

  const allAreTop = await verifyAllProduitsAreTop(productIds);
  if (!allAreTop) {
    return NextResponse.json(
      { error: 'Un ou plusieurs produits introuvables dans les top produits.' },
      { status: 404 },
    );
  }

  const updateResults = await Promise.all(
    reorderItems.map((item) =>
      updateProduitPriorite(item.id, item.priorite),
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
      'top-produits.reorder',
      {
        productIds,
        newOrder: reorderItems.map((item) => item.priorite),
      },
    );
  }

  return NextResponse.json({ success: true });
}
