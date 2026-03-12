import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockSupabaseSelect = vi.fn();
const mockFirestoreGet = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: mockSupabaseSelect,
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getFirestoreClient: () => ({
    collection: () => ({
      where: () => ({
        get: mockFirestoreGet,
      }),
    }),
  }),
}));

import { GET } from '@/app/api/carousel/route';

describe('GET /api/carousel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  });

  it('retourne les slides de fallback si Supabase non configuré', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await GET();
    const body = await response.json();

    expect(body.isFallbackData).toBe(true);
    expect(body.slides.length).toBeGreaterThan(0);
  });

  it('retourne les slides de fallback si Firebase non configuré', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const response = await GET();
    const body = await response.json();

    expect(body.isFallbackData).toBe(true);
  });

  it('retourne les slides depuis Supabase et Firestore', async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: [
        {
          id_slide: 'slide-1',
          titre: 'Slide Un',
          texte: 'Description un',
          lien_redirection: '/produits',
          ordre: 0,
          actif: true,
          image_url: '/fallback.jpg',
        },
      ],
      error: null,
    });

    mockFirestoreGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            slide_id: 'slide-1',
            image_desktop_url: '/desktop.jpg',
            image_mobile_url: '/mobile.jpg',
          }),
        },
      ],
    });

    const response = await GET();
    const body = await response.json();

    expect(body.isFallbackData).toBe(false);
    expect(body.slides).toHaveLength(1);
    expect(body.slides[0].id).toBe('slide-1');
    expect(body.slides[0].imageDesktopUrl).toBe('/desktop.jpg');
    expect(body.slides[0].imageMobileUrl).toBe('/mobile.jpg');
  });

  it('retourne le fallback en cas d erreur Supabase', async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: null,
      error: { message: 'connection failed' },
    });

    const response = await GET();
    const body = await response.json();

    expect(body.isFallbackData).toBe(true);
  });

  it('retourne les slides même si Firestore échoue', async () => {
    mockSupabaseSelect.mockResolvedValue({
      data: [
        {
          id_slide: 'slide-2',
          titre: 'Slide Deux',
          texte: null,
          lien_redirection: null,
          ordre: 0,
          actif: true,
          image_url: '/fallback.jpg',
        },
      ],
      error: null,
    });

    mockFirestoreGet.mockRejectedValue(new Error('Firestore down'));

    const response = await GET();
    const body = await response.json();

    expect(body.isFallbackData).toBe(false);
    expect(body.slides[0].imageUrl).toBe('/fallback.jpg');
  });
});
