import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCartSessionId } from '@/lib/auth/cartSession';

export const dynamic = 'force-dynamic';

// NOTE: Types temporaires en attendant les types auto-générés Supabase
interface PanierRow { id_panier: string }
interface CartLineRow { quantite: number; produit: { prix_ttc: number } | null }

const EMPTY_CART_RESPONSE = { count: 0, total: 0 };

export async function GET() {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);
  const supabaseAdmin = createAdminClient();

  const { data: { user } } = await supabaseClient.auth.getUser();

  const cart = user
    ? await fetchCartByUserId(supabaseAdmin, user.id)
    : await fetchCartBySession(supabaseAdmin);

  if (!cart) {
    return NextResponse.json(EMPTY_CART_RESPONSE);
  }

  const cartTotals = await calculateCartTotals(supabaseAdmin, cart.id_panier);

  return NextResponse.json(cartTotals);
}

async function fetchCartByUserId(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<PanierRow | null> {
  const { data } = await supabaseAdmin
    .from('panier')
    .select('id_panier')
    .eq('id_utilisateur', userId)
    .limit(1)
    .single();

  return data as PanierRow | null;
}

async function fetchCartBySession(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
): Promise<PanierRow | null> {
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

  return data as PanierRow | null;
}

async function calculateCartTotals(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
) {
  const { data } = await supabaseAdmin
    .from('ligne_panier')
    .select('quantite, produit:id_produit(prix_ttc)')
    .eq('id_panier', cartId);

  const cartLines = data as CartLineRow[] | null;

  if (!cartLines || cartLines.length === 0) {
    return EMPTY_CART_RESPONSE;
  }

  const totalItemsCount = cartLines.reduce(
    (sum, line) => sum + line.quantite,
    0,
  );

  const totalPrice = cartLines.reduce((sum, line) => {
    const productPrice = line.produit?.prix_ttc ?? 0;
    return sum + line.quantite * Number(productPrice);
  }, 0);

  return {
    count: totalItemsCount,
    total: Math.round(totalPrice * 100) / 100,
  };
}
