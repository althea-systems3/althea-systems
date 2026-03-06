import { NextRequest, NextResponse } from 'next/server';

/**
 * NOTE: Vérifie que l'origin de la requête correspond au host.
 * Bloque les requêtes cross-origin non-GET (protection CSRF sans token).
 */
export function verifyCsrf(request: NextRequest): NextResponse | null {
  const isReadOnlyMethod = request.method === 'GET' || request.method === 'HEAD';

  if (isReadOnlyMethod) {
    return null;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    return NextResponse.json(
      { error: 'Requête rejetée : headers origin/host manquants' },
      { status: 403 }
    );
  }

  const isOriginMatchingHost = origin.includes(host);

  if (!isOriginMatchingHost) {
    return NextResponse.json(
      { error: 'Requête rejetée : origin non autorisée' },
      { status: 403 }
    );
  }

  return null;
}
