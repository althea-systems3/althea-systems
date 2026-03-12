import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import type { Categorie } from '@/lib/supabase/types';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_STATUTS = ['active', 'inactive'];

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const body = await request.json();

  if (!VALID_STATUTS.includes(body.statut)) {
    return NextResponse.json(
      { error: 'Le statut doit être "active" ou "inactive".' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: existingCategory } = await supabase
    .from('categorie')
    .select('id_categorie')
    .eq('id_categorie', id)
    .single();

  if (!existingCategory) {
    return NextResponse.json(
      { error: 'Catégorie introuvable.' },
      { status: 404 },
    );
  }

  const { data: updatedCategory, error: updateError } = await supabase
    .from('categorie')
    .update({ statut: body.statut } as never)
    .eq('id_categorie', id)
    .select()
    .single();

  if (updateError) {
    console.error('Erreur mise à jour statut catégorie', { updateError });
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut.' },
      { status: 500 },
    );
  }

  const category = updatedCategory as Categorie;

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'categories.status',
      { categoryId: id, statut: body.statut },
    );
  }

  return NextResponse.json({ category });
}
