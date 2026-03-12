import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';

type ReorderItem = { id: string; ordre: number };

function validateReorderItems(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) {
    return 'La liste des slides est requise.';
  }

  const ordres = new Set<number>();

  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') {
      return 'Chaque slide doit avoir un id valide.';
    }

    if (!Number.isInteger(item.ordre) || item.ordre < 1) {
      return 'L ordre doit être un entier positif.';
    }

    if (ordres.has(item.ordre)) {
      return 'Les ordres ne doivent pas contenir de doublons.';
    }

    ordres.add(item.ordre);
  }

  return null;
}

async function verifyAllSlidesExist(
  slideIds: string[],
): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('carrousel')
    .select('*', { count: 'exact', head: true })
    .in('id_slide', slideIds);

  if (error) {
    return false;
  }

  return count === slideIds.length;
}

async function updateSlideOrdre(
  slideId: string,
  newOrdre: number,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('carrousel')
    .update({ ordre: newOrdre } as never)
    .eq('id_slide', slideId);

  return !error;
}

export async function PATCH(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json();
  const { slides } = body;

  const validationError = validateReorderItems(slides);
  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 },
    );
  }

  const reorderItems = slides as ReorderItem[];
  const slideIds = reorderItems.map((item) => item.id);

  const allExist = await verifyAllSlidesExist(slideIds);
  if (!allExist) {
    return NextResponse.json(
      { error: 'Un ou plusieurs slides introuvables.' },
      { status: 404 },
    );
  }

  const updateResults = await Promise.all(
    reorderItems.map((item) => updateSlideOrdre(item.id, item.ordre)),
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
      'carousel.reorder',
      { slideIds, newOrder: reorderItems.map((item) => item.ordre) },
    );
  }

  return NextResponse.json({ success: true });
}
