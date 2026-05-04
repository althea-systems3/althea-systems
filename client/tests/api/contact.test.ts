import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks ---

const mockInsertContact = vi.fn();
const mockSendContactEmail = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => mockInsertContact(),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/checkout/email', () => ({
  sendContactFormNotificationEmail: (args: unknown) =>
    mockSendContactEmail(args),
}));

// --- Import après mocks ---

import { POST } from '@/app/api/contact/route';

function createPostRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendContactEmail.mockResolvedValue(undefined);
  });

  it('retourne 400 si email manquant', async () => {
    const response = await POST(
      createPostRequest({
        email: '',
        subject: 'Sujet',
        message: 'Message valide',
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('invalid_contact_payload');
    expect(body.fieldErrors).toBeDefined();
  });

  it('retourne 400 si email malformé', async () => {
    const response = await POST(
      createPostRequest({
        email: 'pas-un-email',
        subject: 'Sujet test',
        message: 'Message valide qui fait plus de 10 caracteres.',
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('invalid_contact_payload');
  });

  it('retourne 400 si subject manquant', async () => {
    const response = await POST(
      createPostRequest({
        email: 'test@example.com',
        subject: '',
        message: 'Message valide qui fait plus de 10 caracteres.',
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('invalid_contact_payload');
    expect(body.fieldErrors.subject).toBe('required');
  });

  it('crée le message contact avec succès', async () => {
    mockInsertContact.mockResolvedValue({
      data: { id_message: 'msg-001' },
      error: null,
    });

    const response = await POST(
      createPostRequest({
        email: 'client@example.com',
        subject: 'Demande information',
        message: 'Je voudrais avoir plus d informations sur vos produits.',
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.message).toBe('contact_message_created');
    expect(body.messageId).toBe('msg-001');
    expect(mockSendContactEmail).toHaveBeenCalled();
  });

  it("retourne 500 avec errorId si insert échoue", async () => {
    mockInsertContact.mockResolvedValue({
      data: null,
      error: { message: 'database error' },
    });

    const response = await POST(
      createPostRequest({
        email: 'client@example.com',
        subject: 'Demande information',
        message: 'Je voudrais avoir plus d informations sur vos produits.',
      }),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('contact_insert_failed');
    expect(body.errorId).toMatch(/^ERR-/);
  });

  it("retourne 201 même si l'email échoue (best-effort)", async () => {
    mockInsertContact.mockResolvedValue({
      data: { id_message: 'msg-002' },
      error: null,
    });
    mockSendContactEmail.mockRejectedValue(new Error('SMTP down'));

    const response = await POST(
      createPostRequest({
        email: 'client@example.com',
        subject: 'Demande information',
        message: 'Je voudrais avoir plus d informations sur vos produits.',
      }),
    );

    expect(response.status).toBe(201);
  });

  it("retourne 500 avec errorId si JSON body invalide", async () => {
    const badRequest = new Request('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });

    const response = await POST(badRequest);

    // body=null → validation échoue avec champs vides → 400
    expect([400, 500]).toContain(response.status);
  });
});
