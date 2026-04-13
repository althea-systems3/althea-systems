import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { sendPasswordResetEmail } from '@/lib/auth/email';
import {
  computeResetTokenExpiry,
  generateVerificationToken,
} from '@/lib/auth/token';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function fetchUserIdentity(userId: string): Promise<{
  email: string;
  nom_complet: string;
  statut: string;
} | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('utilisateur')
    .select('email, nom_complet, statut')
    .eq('id_utilisateur', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const row = data as {
    email: string;
    nom_complet: string;
    statut: string;
  };

  return row;
}

function buildResetUrl(rawToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${baseUrl}/reinitialisation-mot-de-passe?token=${rawToken}`;
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
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

    const userIdentity = await fetchUserIdentity(userId);

    if (!userIdentity) {
      return NextResponse.json(
        {
          error: 'Utilisateur introuvable.',
          code: 'user_not_found',
        },
        { status: 404 },
      );
    }

    if (userIdentity.statut === 'inactif') {
      return NextResponse.json(
        {
          error:
            'Le compte est inactif. Activez-le avant de renvoyer un reset.',
          code: 'inactive_account',
        },
        { status: 400 },
      );
    }

    const { rawToken, tokenHash } = generateVerificationToken();
    const tokenExpiry = computeResetTokenExpiry();

    const supabaseAdmin = createAdminClient();

    const { error: updateError } = await supabaseAdmin
      .from('utilisateur')
      .update({
        reset_token_hash: tokenHash,
        reset_token_expires_at: tokenExpiry.toISOString(),
      } as never)
      .eq('id_utilisateur', userId);

    if (updateError) {
      console.error('Erreur creation token reset utilisateur admin', {
        updateError,
      });

      return NextResponse.json(
        {
          error: 'Impossible de lancer la reinitialisation du mot de passe.',
          code: 'reset_token_failed',
        },
        { status: 500 },
      );
    }

    await sendPasswordResetEmail({
      recipientEmail: userIdentity.email,
      customerName: userIdentity.nom_complet || 'Client',
      resetUrl: buildResetUrl(rawToken),
    });

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'users.reset_password', {
        userId,
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Erreur reset mot de passe utilisateur admin', { error });

    return NextResponse.json(
      {
        error: 'Impossible de lancer la reinitialisation du mot de passe.',
        code: 'reset_password_failed',
      },
      { status: 500 },
    );
  }
}
