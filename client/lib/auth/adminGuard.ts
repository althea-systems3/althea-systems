import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

export async function verifyAdminAccess(): Promise<NextResponse | null> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { error: 'Authentification requise.' },
      { status: 401 },
    );
  }

  const isAdmin = currentUser.userProfile?.est_admin === true;

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Accès réservé aux administrateurs.' },
      { status: 403 },
    );
  }

  return null;
}
