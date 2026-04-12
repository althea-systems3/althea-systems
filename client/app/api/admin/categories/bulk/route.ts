import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';

type BulkAction = 'activate' | 'deactivate';

type BulkPayload = {
  action?: unknown;
  categoryIds?: unknown;
};

function parseBulkAction(value: unknown): BulkAction | null {
  if (value === 'activate' || value === 'deactivate') {
    return value;
  }

  return null;
}

function parseCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => normalizeString(item)).filter(Boolean)),
  );
}

export async function POST(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = (await request.json().catch(() => null)) as BulkPayload | null;
  const action = parseBulkAction(body?.action);
  const categoryIds = parseCategoryIds(body?.categoryIds);

  if (!action) {
    return NextResponse.json(
      { error: 'Action groupée invalide.' },
      { status: 400 },
    );
  }

  if (categoryIds.length === 0) {
    return NextResponse.json(
      { error: 'Aucune catégorie sélectionnée.' },
      { status: 400 },
    );
  }

  const nextStatus = action === 'activate' ? 'active' : 'inactive';
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('categorie')
    .update({ statut: nextStatus } as never)
    .in('id_categorie', categoryIds);

  if (error) {
    console.error('Erreur action groupée catégories statut', { error });
    return NextResponse.json(
      {
        error: 'Impossible de modifier le statut des catégories sélectionnées.',
      },
      { status: 500 },
    );
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(currentUser.user.id, 'categories.bulk_status', {
      categoryIds,
      statut: nextStatus,
    });
  }

  return NextResponse.json({
    success: true,
    action,
    affectedCount: categoryIds.length,
  });
}
