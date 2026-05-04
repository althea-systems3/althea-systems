import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockGetUser = vi.fn();
const mockGetOrCreateCartSessionId = vi.fn();
const mockGetConversation = vi.fn();
const mockPersistEscalation = vi.fn();
const mockSendEscalationEmail = vi.fn();
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
  headers: vi.fn(() =>
    Promise.resolve({
      get: (name: string) => {
        if (name === 'x-locale') return 'fr';
        if (name === 'accept-language') return 'fr';
        return null;
      },
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
  persistEscalation: (args: unknown) => mockPersistEscalation(args),
  getConversation: (id: string) => mockGetConversation(id),
}));

vi.mock('@/lib/chatbot/logger', () => ({
  logChatbotActivity: (...args: unknown[]) => mockLogChatbotActivity(...args),
}));

vi.mock('@/lib/checkout/email', () => ({
  sendEscalationNotificationEmail: (args: unknown) =>
    mockSendEscalationEmail(args),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/chatbot/escalate/route';

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/chatbot/escalate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/chatbot/escalate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockGetOrCreateCartSessionId.mockResolvedValue({
      sessionId: 'session-abc',
    });
    mockSendEscalationEmail.mockResolvedValue(undefined);
    mockPersistEscalation.mockResolvedValue(undefined);
  });

  it("retourne 400 si conversation_id manquant", async () => {
    const response = await POST(createPostRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('conversation_required');
  });

  it('escalade avec succès quand conversation existe et appartient au user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-001', email: 'a@b.com' } },
      error: null,
    });
    mockGetConversation.mockResolvedValue({
      user_id: 'user-001',
      session_id: 'session-abc',
      message: [{ role: 'user', content: 'help' }],
      metadata: { email: 'a@b.com' },
    });

    const response = await POST(
      createPostRequest({
        conversation_id: 'conv-001',
        reason: 'user_request',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/équipe de support/);
    expect(mockPersistEscalation).toHaveBeenCalledWith({
      conversationId: 'conv-001',
      reason: 'user_request',
    });
    expect(mockLogChatbotActivity).toHaveBeenCalledWith(
      'chatbot_escalation',
      expect.objectContaining({ conversation_id: 'conv-001' }),
    );
  });

  it("retourne 403 si l'utilisateur n'est pas propriétaire de la conversation", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'attacker' } },
      error: null,
    });
    mockGetConversation.mockResolvedValue({
      user_id: 'victim',
      session_id: 'other-session',
      message: [],
    });

    const response = await POST(
      createPostRequest({ conversation_id: 'conv-002' }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('forbidden');
    expect(mockPersistEscalation).not.toHaveBeenCalled();
  });

  it('autorise si conversation orpheline (session_id null) — escalade anonyme', async () => {
    mockGetConversation.mockResolvedValue({
      user_id: null,
      session_id: null,
      message: [],
    });

    const response = await POST(
      createPostRequest({ conversation_id: 'conv-003' }),
    );

    expect(response.status).toBe(200);
    expect(mockPersistEscalation).toHaveBeenCalled();
  });

  it("normalise reason inconnu vers 'user_request'", async () => {
    mockGetConversation.mockResolvedValue(null);

    await POST(
      createPostRequest({
        conversation_id: 'conv-004',
        reason: 'invalid_reason',
      }),
    );

    expect(mockPersistEscalation).toHaveBeenCalledWith({
      conversationId: 'conv-004',
      reason: 'user_request',
    });
  });

  it("retourne 500 avec errorId si persistEscalation jette", async () => {
    mockGetConversation.mockResolvedValue(null);
    mockPersistEscalation.mockRejectedValue(new Error('Firestore down'));

    const response = await POST(
      createPostRequest({ conversation_id: 'conv-005' }),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('server_error');
    expect(body.errorId).toMatch(/^ERR-/);
  });
});
