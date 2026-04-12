import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { normalizeString } from '@/lib/admin/common';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserStatus } from '@/lib/supabase/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UserRow = {
  id_utilisateur: string;
  email: string;
  nom_complet: string;
  est_admin: boolean;
  statut: UserStatus;
  email_verifie: boolean;
  date_inscription: string | null;
  cgu_acceptee_le: string | null;
  date_validation_email: string | null;
};

type AddressRow = {
  id_adresse: string;
  prenom: string | null;
  nom: string | null;
  adresse_1: string | null;
  adresse_2: string | null;
  ville: string | null;
  region: string | null;
  code_postal: string | null;
  pays: string | null;
  telephone: string | null;
};

type PaymentMethodRow = {
  id_paiement: string;
  nom_carte: string | null;
  derniers_4_chiffres: string | null;
  date_expiration: string | null;
  stripe_payment_id: string | null;
  est_defaut: boolean | null;
};

type OrderRow = {
  id_commande: string;
  numero_commande: string;
  id_adresse: string;
  date_commande: string;
  montant_ttc: number | string;
  statut: string;
  statut_paiement: string;
  mode_paiement: string | null;
  paiement_dernier_4: string | null;
};

type DeletePayload = {
  acknowledgeRgpd?: unknown;
  confirmationText?: unknown;
};

type UpdatePayload = {
  statut?: unknown;
};

function parseUserStatus(value: unknown): UserStatus | null {
  if (value === 'actif' || value === 'inactif' || value === 'en_attente') {
    return value;
  }

  return null;
}

function toSafeString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function maskCardDisplay(last4: string | null | undefined): string {
  const safeLast4 = toSafeString(last4);

  if (!safeLast4) {
    return '**** **** **** ----';
  }

  return `**** **** **** ${safeLast4}`;
}

function maskStripePaymentId(value: string | null | undefined): string | null {
  const safeValue = toSafeString(value);

  if (!safeValue) {
    return null;
  }

  if (safeValue.length <= 8) {
    return `${safeValue.slice(0, 2)}***${safeValue.slice(-2)}`;
  }

  return `${safeValue.slice(0, 4)}***${safeValue.slice(-4)}`;
}

async function fetchLastSignIn(userId: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient();

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data?.user) {
      return null;
    }

    return data.user.last_sign_in_at ?? null;
  } catch {
    return null;
  }
}

async function fetchUserById(userId: string): Promise<UserRow | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('utilisateur')
    .select(
      'id_utilisateur, email, nom_complet, est_admin, statut, email_verifie, date_inscription, cgu_acceptee_le, date_validation_email',
    )
    .eq('id_utilisateur', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserRow;
}

async function fetchAddressesByUserId(userId: string): Promise<AddressRow[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('adresse')
    .select(
      'id_adresse, prenom, nom, adresse_1, adresse_2, ville, region, code_postal, pays, telephone',
    )
    .eq('id_utilisateur', userId)
    .order('id_adresse', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Erreur lecture adresses utilisateur admin', { error });
    return [];
  }

  return (data as AddressRow[] | null) ?? [];
}

async function fetchPaymentMethodsByUserId(
  userId: string,
): Promise<PaymentMethodRow[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('methode_paiement')
    .select(
      'id_paiement, nom_carte, derniers_4_chiffres, date_expiration, stripe_payment_id, est_defaut',
    )
    .eq('id_utilisateur', userId)
    .order('est_defaut', { ascending: false })
    .order('id_paiement', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Erreur lecture moyens paiement utilisateur admin', {
      error,
    });
    return [];
  }

  return (data as PaymentMethodRow[] | null) ?? [];
}

async function fetchOrdersByUserId(userId: string): Promise<OrderRow[]> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('commande')
    .select(
      'id_commande, numero_commande, id_adresse, date_commande, montant_ttc, statut, statut_paiement, mode_paiement, paiement_dernier_4',
    )
    .eq('id_utilisateur', userId)
    .order('date_commande', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Erreur lecture commandes utilisateur admin', { error });
    return [];
  }

  return (data as OrderRow[] | null) ?? [];
}

function buildOrdersSummary(orders: OrderRow[]): {
  nombre_commandes: number;
  chiffre_affaires_total: number;
} {
  const chiffreAffairesTotal = orders.reduce((runningTotal, order) => {
    const amount = Number(order.montant_ttc);

    if (!Number.isFinite(amount)) {
      return runningTotal;
    }

    return runningTotal + amount;
  }, 0);

  return {
    nombre_commandes: orders.length,
    chiffre_affaires_total: Math.round(chiffreAffairesTotal * 100) / 100,
  };
}

function withAddressUsage(addresses: AddressRow[], orders: OrderRow[]) {
  const addressUsage = new Map<string, number>();

  orders.forEach((order) => {
    const currentCount = addressUsage.get(order.id_adresse) ?? 0;
    addressUsage.set(order.id_adresse, currentCount + 1);
  });

  return addresses.map((address) => ({
    ...address,
    utilisation_commandes: addressUsage.get(address.id_adresse) ?? 0,
  }));
}

function withMaskedPaymentMethods(paymentMethods: PaymentMethodRow[]) {
  return paymentMethods.map((paymentMethod) => ({
    ...paymentMethod,
    carte_masquee: maskCardDisplay(paymentMethod.derniers_4_chiffres),
    stripe_payment_id_masque: maskStripePaymentId(
      paymentMethod.stripe_payment_id,
    ),
  }));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const userId = normalizeString(id);

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Identifiant utilisateur invalide.',
          code: 'id_invalid',
        },
        { status: 400 },
      );
    }

    const user = await fetchUserById(userId);

    if (!user) {
      return NextResponse.json(
        {
          error: 'Utilisateur introuvable.',
          code: 'user_not_found',
        },
        { status: 404 },
      );
    }

    const [addresses, paymentMethods, orders, lastSignIn] = await Promise.all([
      fetchAddressesByUserId(userId),
      fetchPaymentMethodsByUserId(userId),
      fetchOrdersByUserId(userId),
      fetchLastSignIn(userId),
    ]);

    const summary = buildOrdersSummary(orders);

    return NextResponse.json({
      user: {
        ...user,
        derniere_connexion: lastSignIn,
      },
      addresses: withAddressUsage(addresses, orders),
      paymentMethods: withMaskedPaymentMethods(paymentMethods),
      orders,
      summary,
    });
  } catch (error) {
    console.error('Erreur inattendue detail utilisateur admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const userId = normalizeString(id);

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Identifiant utilisateur invalide.',
          code: 'id_invalid',
        },
        { status: 400 },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as UpdatePayload | null;

    const nextStatus = parseUserStatus(body?.statut);

    if (!nextStatus) {
      return NextResponse.json(
        {
          error: 'Statut utilisateur invalide.',
          code: 'status_invalid',
        },
        { status: 400 },
      );
    }

    const existingUser = await fetchUserById(userId);

    if (!existingUser) {
      return NextResponse.json(
        {
          error: 'Utilisateur introuvable.',
          code: 'user_not_found',
        },
        { status: 404 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('utilisateur')
      .update({ statut: nextStatus } as never)
      .eq('id_utilisateur', userId)
      .select(
        'id_utilisateur, email, nom_complet, est_admin, statut, email_verifie, date_inscription, cgu_acceptee_le, date_validation_email',
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: 'Impossible de mettre a jour le statut utilisateur.',
          code: 'user_update_failed',
        },
        { status: 500 },
      );
    }

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'users.status_update', {
        userId,
        previousStatus: existingUser.statut,
        nextStatus,
      });
    }

    return NextResponse.json({
      user: data,
    });
  } catch (error) {
    console.error('Erreur inattendue mise a jour utilisateur admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const userId = normalizeString(id);

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Identifiant utilisateur invalide.',
          code: 'id_invalid',
        },
        { status: 400 },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as DeletePayload | null;

    const acknowledgeRgpd = body?.acknowledgeRgpd === true;
    const confirmationText = normalizeString(body?.confirmationText);

    if (!acknowledgeRgpd || confirmationText !== 'SUPPRIMER') {
      return NextResponse.json(
        {
          error:
            'Confirmation RGPD invalide. Cochez l avertissement et saisissez SUPPRIMER.',
          code: 'rgpd_confirmation_required',
        },
        { status: 400 },
      );
    }

    const existingUser = await fetchUserById(userId);

    if (!existingUser) {
      return NextResponse.json(
        {
          error: 'Utilisateur introuvable.',
          code: 'user_not_found',
        },
        { status: 404 },
      );
    }

    if (existingUser.est_admin) {
      return NextResponse.json(
        {
          error:
            'La suppression RGPD d un compte administrateur est interdite.',
          code: 'admin_delete_forbidden',
        },
        { status: 400 },
      );
    }

    const anonymizedEmail = `supprime+${userId.slice(0, 8)}@althea.local`;
    const supabaseAdmin = createAdminClient();

    const { error: userUpdateError } = await supabaseAdmin
      .from('utilisateur')
      .update({
        nom_complet: 'Compte supprime',
        email: anonymizedEmail,
        statut: 'inactif',
        email_verifie: false,
        validation_token_hash: null,
        validation_token_expires_at: null,
        date_validation_email: null,
        reset_token_hash: null,
        reset_token_expires_at: null,
      } as never)
      .eq('id_utilisateur', userId);

    if (userUpdateError) {
      console.error('Erreur anonymisation utilisateur RGPD', {
        userUpdateError,
      });

      return NextResponse.json(
        {
          error: 'Impossible de supprimer les donnees personnelles du compte.',
          code: 'rgpd_delete_failed',
        },
        { status: 500 },
      );
    }

    const [addressUpdateResult, paymentDeleteResult, authUpdateResult] =
      await Promise.allSettled([
        supabaseAdmin
          .from('adresse')
          .update({
            prenom: 'Anonyme',
            nom: 'Compte supprime',
            adresse_1: 'Donnee supprimee',
            adresse_2: null,
            ville: '-',
            region: null,
            code_postal: '00000',
            pays: 'FR',
            telephone: null,
          } as never)
          .eq('id_utilisateur', userId),
        supabaseAdmin
          .from('methode_paiement')
          .delete()
          .eq('id_utilisateur', userId),
        supabaseAdmin.auth.admin.updateUserById(userId, {
          email: anonymizedEmail,
          password: randomUUID(),
        }),
      ]);

    if (addressUpdateResult.status === 'rejected') {
      console.error('Erreur anonymisation adresses RGPD', {
        error: addressUpdateResult.reason,
      });
    }

    if (paymentDeleteResult.status === 'rejected') {
      console.error('Erreur suppression moyens paiement RGPD', {
        error: paymentDeleteResult.reason,
      });
    }

    if (
      authUpdateResult.status === 'fulfilled' &&
      authUpdateResult.value.error
    ) {
      console.error('Erreur sync auth suppression RGPD', {
        error: authUpdateResult.value.error,
      });
    }

    if (authUpdateResult.status === 'rejected') {
      console.error('Erreur update auth suppression RGPD', {
        error: authUpdateResult.reason,
      });
    }

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'users.rgpd_delete', {
        userId,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Erreur inattendue suppression utilisateur admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}
