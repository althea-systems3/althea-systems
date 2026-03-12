import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import type { Carrousel } from '@/lib/supabase/types';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body.actif !== 'boolean') {
    return NextResponse.json(
      { error: 'Le champ actif doit être un booléen.' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: existingSlide } = await supabase
    .from('carrousel')
    .select('id_slide')
    .eq('id_slide', id)
    .single();

  if (!existingSlide) {
    return NextResponse.json(
      { error: 'Slide introuvable.' },
      { status: 404 },
    );
  }

  const { data: updatedSlide, error: updateError } = await supabase
    .from('carrousel')
    .update({ actif: body.actif } as never)
    .eq('id_slide', id)
    .select()
    .single();

  if (updateError) {
    console.error('Erreur mise à jour statut slide', { updateError });
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut.' },
      { status: 500 },
    );
  }

  const slide = updatedSlide as Carrousel;

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'carousel.status',
      { slideId: id, actif: body.actif },
    );
  }

  return NextResponse.json({ slide });
}
