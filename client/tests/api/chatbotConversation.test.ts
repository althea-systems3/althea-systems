import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockGetOrCreateCartSessionId = vi.fn();
const mockGetConversation = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: () => null,
      set: vi.fn(),
      delete: vi.fn(),
      getAll: () => [],
    }),
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

vi.mock('@/lib/auth/cartSession', () => ({
  getOrCreateCartSessionId: () => mockGetOrCreateCartSessionId(),
}));

vi.mock('@/lib/chatbot/firestore', () => ({
  getConversation: (id: string) => mockGetConversation(id),
}));

// --- Import après mocks ---

import { GET } from '@/app/api/chatbot/[conversation_id]/route';

function createGetContext(conversation_id: string) {
  return { params: Promise.resolve({ conversation_id }) };
}

describe('GET /api/chatbot/[conversation_id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockGetOrCreateCartSessionId.mockResolvedValue({
      sessionId: 'session-abc',
    });
  });

  it('retourne 400 si conversation_id vide', async () => {
    const response = await GET(
      new Request('http://localhost:3000/api/chatbot/'),
      createGetContext('   '),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('id_required');
  });

  it('retourne 404 si conversation inexistante', async () => {
    mockGetConversation.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost:3000/api/chatbot/conv-x'),
      createGetContext('conv-x'),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('not_found');
  });

  it('retourne 403 si conversation appartient à un autre user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'attacker' } },
      error: null,
    });
    mockGetConversation.mockResolvedValue({
      conversation_id: 'conv-001',
      user_id: 'victim',
      session_id: 'other-session',
      message: [],
    });

    const response = await GET(
      new Request('http://localhost:3000/api/chatbot/conv-001'),
      createGetContext('conv-001'),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('forbidden');
  });

  it('retourne 200 si conversation appartient au user connecté', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001' } },
      error: null,
    });
    mockGetConversation.mockResolvedValue({
      conversation_id: 'conv-002',
      user_id: 'user-001',
      session_id: 'irrelevant',
      message: [{ role: 'user', content: 'Hi' }],
      metadata: { lang: 'fr' },
    });

    const response = await GET(
      new Request('http://localhost:3000/api/chatbot/conv-002'),
      createGetContext('conv-002'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.conversation_id).toBe('conv-002');
    expect(body.messages).toHaveLength(1);
    expect(body.metadata).toEqual({ lang: 'fr' });
  });

  it('retourne 200 si guest avec session_id matchant', async () => {
    mockGetConversation.mockResolvedValue({
      conversation_id: 'conv-003',
      user_id: null,
      session_id: 'session-abc',
      message: [],
      metadata: null,
    });

    const response = await GET(
      new Request('http://localhost:3000/api/chatbot/conv-003'),
      createGetContext('conv-003'),
    );

    expect(response.status).toBe(200);
  });

  it("retourne 500 avec errorId si firestore échoue", async () => {
    mockGetConversation.mockRejectedValue(new Error('Firestore down'));

    const response = await GET(
      new Request('http://localhost:3000/api/chatbot/conv-x'),
      createGetContext('conv-x'),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('server_error');
    expect(body.errorId).toMatch(/^ERR-/);
  });
});
