import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@/lib/supabase/server';
import {
  SESSION_EXPIRED_MESSAGE,
  SESSION_EXPIRED_CODE,
} from '@/lib/account/constants';

// --- Types ---

type AuthSuccess = {
  userId: string;
  response: null;
};

type AuthFailure = {
  userId: null;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

// --- Guard ---

export async function requireAuthenticatedUser(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const supabaseClient = createServerClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return {
      userId: null,
      response: NextResponse.json(
        {
          error: SESSION_EXPIRED_MESSAGE,
          code: SESSION_EXPIRED_CODE,
        },
        { status: 401 },
      ),
    };
  }

  return {
    userId: user.id,
    response: null,
  };
}
