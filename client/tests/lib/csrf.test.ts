import { describe, expect, it } from 'vitest';

import { verifyCsrf } from '@/lib/auth/csrf';

function createMockRequest(
  method: string,
  origin: string | null,
  host: string | null
) {
  return {
    method,
    headers: {
      get: (headerName: string) => {
        if (headerName === 'origin') { return origin; }
        if (headerName === 'host') { return host; }
        return null;
      },
    },
  } as unknown as Parameters<typeof verifyCsrf>[0];
}

describe('verifyCsrf', () => {
  it('laisse passer les requêtes GET sans vérification', () => {
    const request = createMockRequest('GET', null, null);

    const result = verifyCsrf(request);

    expect(result).toBeNull();
  });

  it('laisse passer les requêtes HEAD sans vérification', () => {
    const request = createMockRequest('HEAD', null, null);

    const result = verifyCsrf(request);

    expect(result).toBeNull();
  });

  it('bloque les requêtes POST sans header origin', async () => {
    const request = createMockRequest('POST', null, 'localhost:3000');

    const result = verifyCsrf(request);

    expect(result).not.toBeNull();
    const responseBody = await result!.json();
    expect(responseBody.error).toContain('headers origin/host manquants');
  });

  it('bloque les requêtes POST avec origin différent du host', async () => {
    const request = createMockRequest('POST', 'https://evil.com', 'localhost:3000');

    const result = verifyCsrf(request);

    expect(result).not.toBeNull();
    const responseBody = await result!.json();
    expect(responseBody.error).toContain('origin non autorisée');
  });

  it('laisse passer les requêtes POST avec origin correspondant au host', () => {
    const request = createMockRequest(
      'POST',
      'https://localhost:3000',
      'localhost:3000'
    );

    const result = verifyCsrf(request);

    expect(result).toBeNull();
  });
});
