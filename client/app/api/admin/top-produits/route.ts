import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { validateIdProduit } from '@/lib/top-produits/validation';
import { MAX_TOP_PRODUITS } from '@/lib/top-produits/constants';
import type { Produit } from '@/lib/supabase/types';

async function fetchTopProduits(): Promise<Produit[] | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('produit')
    .select('*')
    .eq('est_top_produit', true)
    .order('priorite', { ascending: true });

  if (error) {
    console.error('Erreur chargement top produits admin', { error });
    return null;
  }

  return (data ?? []) as Produit[];
}

async function countTopProduits(): Promise<number | null> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('produit')
    .select('*', { count: 'exact', head: true })
    .eq('est_top_produit', true);

  if (error) {
    console.error('Erreur comptage top produits', { error });
    return null;
  }

  return count ?? 0;
}

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

async function computeNextPriorite(): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('produit')
    .select('priorite')
    .eq('est_top_produit', true)
    .order('priorite', { ascending: false })
    .limit(1)
    .single();

  const lastProduct = data as { priorite: number } | null;
  return lastProduct ? lastProduct.priorite + 1 : 1;
}

export async function GET() {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const produits = await fetchTopProduits();

  if (!produits) {
    return NextResponse.json(
      { error: 'Erreur lors du chargement des top produits.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ produits });
}

export async function POST(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json();

  const idError = validateIdProduit(body.id_produit);
  if (idError) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }

  const produit = await fetchProduitById(body.id_produit);

  if (!produit) {
    return NextResponse.json(
      { error: 'Produit introuvable.' },
      { status: 404 },
    );
  }

  if (produit.statut !== 'publie') {
    return NextResponse.json(
      { error: 'Seuls les produits publiés peuvent être mis en avant.' },
      { status: 400 },
    );
  }

  if (produit.est_top_produit) {
    return NextResponse.json(
      { error: 'Ce produit est déjà dans les top produits.' },
      { status: 400 },
    );
  }

  const topCount = await countTopProduits();

  if (topCount === null) {
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    );
  }

  if (topCount >= MAX_TOP_PRODUITS) {
    return NextResponse.json(
      { error: `Limite de ${MAX_TOP_PRODUITS} top produits atteinte.` },
      { status: 400 },
    );
  }

  const nextPriorite = await computeNextPriorite();
  const supabase = createAdminClient();

  const { data: updatedProduct, error: updateError } = await supabase
    .from('produit')
    .update({
      est_top_produit: true,
      priorite: nextPriorite,
    } as never)
    .eq('id_produit', body.id_produit)
    .select()
    .single();

  if (updateError) {
    console.error('Erreur ajout top produit', { updateError });
    return NextResponse.json(
      { error: 'Erreur lors de l ajout du top produit.' },
      { status: 500 },
    );
  }

  const topProduit = updatedProduct as Produit;

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'top-produits.add',
      { productId: topProduit.id_produit, nom: topProduit.nom },
    );
  }

  return NextResponse.json({ produit: topProduit }, { status: 201 });
}
