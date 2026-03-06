import crypto from 'crypto';

import { cookies } from 'next/headers';

const CART_COOKIE_NAME = 'cart_session_id';
const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function signValue(value: string): string {
  const secret = process.env.CART_COOKIE_SECRET!;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('base64url');
  return `${value}.${signature}`;
}

function unsignValue(signedValue: string): string | null {
  const lastDotIndex = signedValue.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return null;
  }

  const originalValue = signedValue.slice(0, lastDotIndex);
  const expectedSignedValue = signValue(originalValue);

  // NOTE: timingSafeEqual empêche les attaques par timing
  if (signedValue.length !== expectedSignedValue.length) {
    return null;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signedValue),
    Buffer.from(expectedSignedValue)
  );

  return isValid ? originalValue : null;
}

export async function getCartSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!existingCookie) {
    return null;
  }

  return unsignValue(existingCookie);
}

export async function getOrCreateCartSessionId(): Promise<{
  sessionId: string;
  isNewSession: boolean;
}> {
  const existingSessionId = await getCartSessionId();

  if (existingSessionId) {
    return { sessionId: existingSessionId, isNewSession: false };
  }

  const newSessionId = crypto.randomUUID();
  const cookieStore = await cookies();

  cookieStore.set(CART_COOKIE_NAME, signValue(newSessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });

  return { sessionId: newSessionId, isNewSession: true };
}

export async function clearCartSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE_NAME);
}
