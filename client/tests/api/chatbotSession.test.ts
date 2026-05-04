import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockGetOrCreateCartSessionId = vi.fn();
const mockGetOrCreateConversation = vi.fn();
const mockLogChatbotActivity = vi.fn();

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
  getOrCreateConversation: (args: unknown) =>
    mockGetOrCreateConversation(args),
}));

vi.mock('@/lib/chatbot/logger', () => ({
  logChatbotActivity: (...args: unknown[]) => mockLogChatbotActivity(...args),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/chatbot/session/route';

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/chatbot/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/chatbot/session', () => {
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

  it('crée une nouvelle session et log activité chatbot', async () => {
    mockGetOrCreateConversation.mockResolvedValue({
      conversationId: 'conv-001',
      isNew: true,
      messages: [],
    });

    const response = await POST(createPostRequest({ source: 'widget' }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.conversation_id).toBe('conv-001');
    expect(body.historique).toEqual([]);
    expect(mockLogChatbotActivity).toHaveBeenCalledWith(
      'chatbot_session_created',
      expect.objectContaining({ conversation_id: 'conv-001' }),
    );
  });

  it('ne logue pas si la conversation existait déjà', async () => {
    mockGetOrCreateConversation.mockResolvedValue({
      conversationId: 'conv-002',
      isNew: false,
      messages: [{ role: 'user', content: 'Bonjour' }],
    });

    const response = await POST(createPostRequest({}));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.conversation_id).toBe('conv-002');
    expect(body.historique).toHaveLength(1);
    expect(mockLogChatbotActivity).not.toHaveBeenCalled();
  });

  it('normalise source en widget si valeur inconnue', async () => {
    mockGetOrCreateConversation.mockResolvedValue({
      conversationId: 'conv-003',
      isNew: true,
      messages: [],
    });

    await POST(createPostRequest({ source: 'unknown_value' }));

    expect(mockGetOrCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'widget' }),
    );
  });

  it('passe userId si utilisateur connecté', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-007' } },
      error: null,
    });
    mockGetOrCreateConversation.mockResolvedValue({
      conversationId: 'conv-004',
      isNew: true,
      messages: [],
    });

    await POST(createPostRequest({ source: 'page_contact' }));

    expect(mockGetOrCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-007',
        source: 'page_contact',
      }),
    );
  });

  it("retourne 500 avec errorId si firestore échoue", async () => {
    mockGetOrCreateConversation.mockRejectedValue(new Error('Firestore down'));

    const response = await POST(createPostRequest({}));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('server_error');
    expect(body.errorId).toMatch(/^ERR-/);
  });

  it('génère un sessionId fallback si getOrCreateCartSessionId échoue', async () => {
    mockGetOrCreateCartSessionId.mockRejectedValue(new Error('Cookie issue'));
    mockGetOrCreateConversation.mockResolvedValue({
      conversationId: 'conv-005',
      isNew: true,
      messages: [],
    });

    const response = await POST(createPostRequest({}));

    expect(response.status).toBe(200);
    expect(mockGetOrCreateConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: expect.stringMatching(/^chat-/),
      }),
    );
  });
});
