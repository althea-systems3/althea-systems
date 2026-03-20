import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import type { Produit } from '@/lib/supabase/types';

type RouteParams = { params: Promise<{ id: string }> };

async function fetchProduitById(
  productId: string,
): Promise<Produit | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('produit')
    .select('*')
    .eq('id_produit', productId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Produit;
}

async function reindexPriorites(): Promise<void> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('produit')
    .select('id_produit')
    .eq('est_top_produit', true)
    .order('priorite', { ascending: true });

  if (!data || data.length === 0) {
    return;
  }

  const produits = data as { id_produit: string }[];

  const updatePromises = produits.map((produit, index) => {
    return supabase
      .from('produit')
      .update({ priorite: index + 1 } as never)
      .eq('id_produit', produit.id_produit);
  });

  await Promise.all(updatePromises);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const produit = await fetchProduitById(id);

  if (!produit) {
    return NextResponse.json(
      { error: 'Produit introuvable.' },
      { status: 404 },
    );
  }

  if (!produit.est_top_produit) {
    return NextResponse.json(
      { error: 'Ce produit n est pas dans les top produits.' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from('produit')
    .update({
      est_top_produit: false,
      priorite: 0,
    } as never)
    .eq('id_produit', id);

  if (updateError) {
    console.error('Erreur retrait top produit', { updateError });
    return NextResponse.json(
      { error: 'Erreur lors du retrait du top produit.' },
      { status: 500 },
    );
  }

  try {
    await reindexPriorites();
  } catch (reindexError) {
    console.error('Erreur réindexation priorités', { reindexError });
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'top-produits.remove',
      { productId: id, nom: produit.nom },
    );
  }

  return NextResponse.json({ success: true });
}
