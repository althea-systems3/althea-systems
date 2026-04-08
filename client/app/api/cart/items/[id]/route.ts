import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCartSessionId } from '@/lib/auth/cartSession';
import { MAX_QUANTITY_PER_LINE } from '@/lib/products/constants';
import type { Panier, LignePanier, Produit } from '@/lib/supabase/types';

const MIN_QUANTITY = 0;

// --- Auth helpers ---

async function resolveCartId(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string | null,
): Promise<string | null> {
  if (userId) {
    const { data } = await supabaseAdmin
      .from('panier')
      .select('id_panier')
      .eq('id_utilisateur', userId)
      .limit(1)
      .single();

    return data ? (data as Panier).id_panier : null;
  }

  const sessionId = await getCartSessionId();

  if (!sessionId) {
    return null;
  }

  const { data } = await supabaseAdmin
    .from('panier')
    .select('id_panier')
    .eq('session_id', sessionId)
    .limit(1)
    .single();

  return data ? (data as Panier).id_panier : null;
}

// --- Cart line helpers ---

async function fetchCartLine(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  lineId: string,
): Promise<LignePanier | null> {
  const { data } = await supabaseAdmin
    .from('ligne_panier')
    .select('id_ligne_panier, id_panier, id_produit, quantite')
    .eq('id_ligne_panier', lineId)
    .single();

  if (!data) {
    return null;
  }

  return data as LignePanier;
}

async function fetchProductStock(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  productId: string,
): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('produit')
    .select('quantite_stock')
    .eq('id_produit', productId)
    .eq('statut', 'publie')
    .single();

  if (!data) {
    return null;
  }

  return (data as Pick<Produit, 'quantite_stock'>).quantite_stock;
}

// --- PATCH handler ---

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: lineId } = await params;
    const body = await request.json();
    const quantite = Number(body.quantite);

    if (!Number.isInteger(quantite) || quantite < MIN_QUANTITY) {
      return NextResponse.json(
        { error: 'quantite doit être un entier >= 0' },
        { status: 400 },
      );
    }

    if (quantite > MAX_QUANTITY_PER_LINE) {
      return NextResponse.json(
        { error: `quantite ne peut pas dépasser ${MAX_QUANTITY_PER_LINE}` },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const { data: { user } } = await supabaseClient.auth.getUser();
    const cartId = await resolveCartId(supabaseAdmin, user?.id ?? null);

    if (!cartId) {
      return NextResponse.json(
        { error: 'Panier introuvable' },
        { status: 404 },
      );
    }

    const cartLine = await fetchCartLine(supabaseAdmin, lineId);

    if (!cartLine || cartLine.id_panier !== cartId) {
      return NextResponse.json(
        { error: 'Ligne panier introuvable' },
        { status: 404 },
      );
    }

    // NOTE: quantite = 0 → suppression implicite
    if (quantite === 0) {
      await supabaseAdmin
        .from('ligne_panier')
        .delete()
        .eq('id_ligne_panier', lineId);

      return NextResponse.json({ deleted: true });
    }

    const availableStock = await fetchProductStock(
      supabaseAdmin,
      cartLine.id_produit,
    );

    if (availableStock === null) {
      return NextResponse.json(
        { error: 'Produit inexistant ou non publié' },
        { status: 404 },
      );
    }

    if (quantite > availableStock) {
      return NextResponse.json(
        {
          error: 'Stock insuffisant',
          availableStock,
        },
        { status: 400 },
      );
    }

    const { data: updatedLine, error: updateError } = await supabaseAdmin
      .from('ligne_panier')
      .update({ quantite } as never)
      .eq('id_ligne_panier', lineId)
      .select('id_ligne_panier, id_panier, id_produit, quantite')
      .single();

    if (updateError || !updatedLine) {
      return NextResponse.json(
        { error: 'Impossible de mettre à jour la ligne' },
        { status: 500 },
      );
    }

    return NextResponse.json({ cartLine: updatedLine });
  } catch (error) {
    console.error('Erreur inattendue modification ligne panier', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}

// --- DELETE handler ---

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: lineId } = await params;

    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const { data: { user } } = await supabaseClient.auth.getUser();
    const cartId = await resolveCartId(supabaseAdmin, user?.id ?? null);

    if (!cartId) {
      return NextResponse.json(
        { error: 'Panier introuvable' },
        { status: 404 },
      );
    }

    const cartLine = await fetchCartLine(supabaseAdmin, lineId);

    if (!cartLine || cartLine.id_panier !== cartId) {
      return NextResponse.json(
        { error: 'Ligne panier introuvable' },
        { status: 404 },
      );
    }

    await supabaseAdmin
      .from('ligne_panier')
      .delete()
      .eq('id_ligne_panier', lineId);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Erreur inattendue suppression ligne panier', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
