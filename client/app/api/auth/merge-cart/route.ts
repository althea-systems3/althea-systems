import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCartSessionId, clearCartSession } from '@/lib/auth/cartSession';
import { verifyCsrf } from '@/lib/auth/csrf';

export const dynamic = 'force-dynamic';

// NOTE: Types temporaires en attendant les types auto-générés Supabase
interface PanierRow { id_panier: string }
interface LignePanierRow { id_produit: string; quantite: number }

export async function POST(request: NextRequest) {
  const csrfError = verifyCsrf(request);

  if (csrfError) {
    return csrfError;
  }

  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentification requise.' },
      { status: 401 }
    );
  }

  const guestSessionId = await getCartSessionId();

  if (!guestSessionId) {
    return NextResponse.json({ isMerged: false, reason: 'aucun_panier_guest' });
  }

  const supabaseAdmin = createAdminClient();

  const guestCart = await fetchGuestCart(supabaseAdmin, guestSessionId);

  if (!guestCart) {
    await clearCartSession();
    return NextResponse.json({ isMerged: false, reason: 'aucun_panier_guest' });
  }

  const userCart = await fetchOrCreateUserCart(supabaseAdmin, user.id);

  if (!userCart) {
    console.error('Impossible de créer le panier utilisateur', { userId: user.id });
    return NextResponse.json(
      { error: 'Impossible de créer le panier.' },
      { status: 500 }
    );
  }

  await mergeGuestLinesIntoUserCart(supabaseAdmin, guestCart.id_panier, userCart.id_panier);
  await deleteGuestCart(supabaseAdmin, guestCart.id_panier);
  await clearCartSession();

  return NextResponse.json({ isMerged: true });
}

async function fetchGuestCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  sessionId: string,
): Promise<PanierRow | null> {
  const { data } = await supabaseAdmin
    .from('panier')
    .select('id_panier')
    .eq('session_id', sessionId)
    .single();

  return data as PanierRow | null;
}

async function fetchOrCreateUserCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<PanierRow | null> {
  const { data: existingCart } = await supabaseAdmin
    .from('panier')
    .select('id_panier')
    .eq('id_utilisateur', userId)
    .single();

  if (existingCart) {
    return existingCart as PanierRow;
  }

  const { data: newCart } = await supabaseAdmin
    .from('panier')
    .insert({ id_utilisateur: userId } as never)
    .select('id_panier')
    .single();

  return newCart as PanierRow | null;
}

async function mergeGuestLinesIntoUserCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  guestCartId: string,
  userCartId: string,
) {
  const { data } = await supabaseAdmin
    .from('ligne_panier')
    .select('id_produit, quantite')
    .eq('id_panier', guestCartId);

  const guestLines = data as LignePanierRow[] | null;

  if (!guestLines || guestLines.length === 0) {
    return;
  }

  // NOTE: UPSERT — si le produit existe déjà dans le panier user,
  // la quantité du guest écrase (dernier ajout = intention la plus récente)
  for (const guestLine of guestLines) {
    await supabaseAdmin
      .from('ligne_panier')
      .upsert(
        {
          id_panier: userCartId,
          id_produit: guestLine.id_produit,
          quantite: guestLine.quantite,
        } as never,
        { onConflict: 'id_panier,id_produit' },
      );
  }
}

async function deleteGuestCart(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  guestCartId: string,
) {
  // NOTE: ON DELETE CASCADE supprime aussi les ligne_panier associées
  await supabaseAdmin
    .from('panier')
    .delete()
    .eq('id_panier', guestCartId);
}
