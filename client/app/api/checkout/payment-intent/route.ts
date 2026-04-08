import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCartSessionId } from '@/lib/auth/cartSession';
import { getStripeClient } from '@/lib/stripe/client';
import { CURRENCY_CODE } from '@/lib/checkout/constants';

// --- Types ---

type CartLineRow = {
  id_produit: string;
  quantite: number;
  produit: {
    prix_ttc: number;
    quantite_stock: number;
    statut: string;
  } | null;
};

const CENTS_MULTIPLIER = 100;

// --- Helpers ---

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

    return (data as { id_panier: string } | null)?.id_panier ?? null;
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

  return (data as { id_panier: string } | null)?.id_panier ?? null;
}

async function fetchCartLines(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  cartId: string,
): Promise<CartLineRow[]> {
  const { data, error } = await supabaseAdmin
    .from('ligne_panier')
    .select(
      'id_produit, quantite, produit:id_produit(prix_ttc, quantite_stock, statut)',
    )
    .eq('id_panier', cartId);

  if (error || !data) {
    return [];
  }

  return data as unknown as CartLineRow[];
}

function computeCartTotalCents(lines: CartLineRow[]): number {
  const totalEuros = lines.reduce((sum, line) => {
    if (!line.produit || line.produit.statut !== 'publie') {
      return sum;
    }

    return sum + line.produit.prix_ttc * line.quantite;
  }, 0);

  return Math.round(totalEuros * CENTS_MULTIPLIER);
}

function findStockIssues(lines: CartLineRow[]): string[] {
  const issues: string[] = [];

  for (const line of lines) {
    if (!line.produit || line.produit.statut !== 'publie') {
      issues.push(`Produit ${line.id_produit} indisponible`);
      continue;
    }

    if (line.quantite > line.produit.quantite_stock) {
      issues.push(
        `Stock insuffisant pour ${line.id_produit} (demandé: ${line.quantite}, disponible: ${line.produit.quantite_stock})`,
      );
    }
  }

  return issues;
}

// --- Handler ---

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabaseClient = createServerClient(cookieStore);
    const supabaseAdmin = createAdminClient();

    const { data: { user } } = await supabaseClient.auth.getUser();
    const cartId = await resolveCartId(supabaseAdmin, user?.id ?? null);

    if (!cartId) {
      return NextResponse.json(
        { error: 'Panier introuvable' },
        { status: 400 },
      );
    }

    const cartLines = await fetchCartLines(supabaseAdmin, cartId);

    if (cartLines.length === 0) {
      return NextResponse.json(
        { error: 'Panier vide' },
        { status: 400 },
      );
    }

    const stockIssues = findStockIssues(cartLines);

    if (stockIssues.length > 0) {
      return NextResponse.json(
        { error: 'Conflit de stock', issues: stockIssues },
        { status: 409 },
      );
    }

    const totalCents = computeCartTotalCents(cartLines);

    if (totalCents <= 0) {
      return NextResponse.json(
        { error: 'Montant invalide' },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: CURRENCY_CODE,
      metadata: {
        cartId,
        userId: user?.id ?? 'guest',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalCents,
    });
  } catch (error) {
    console.error('Erreur création PaymentIntent', { error });
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
