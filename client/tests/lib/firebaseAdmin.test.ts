import { describe, expect, it, vi, beforeEach } from 'vitest';

// NOTE: On mock firebase-admin car on ne veut pas initialiser
// une vraie connexion Firebase dans les tests
const mockFirestore = vi.fn();
const mockStorage = vi.fn();
const mockInitializeApp = vi.fn(() => ({
  firestore: mockFirestore,
  storage: mockStorage,
}));
const mockCert = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: mockInitializeApp,
    credential: { cert: mockCert },
  },
}));

describe('Firebase Admin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-bucket.appspot.com';
  });

  it('initialise le client Firebase avec les bonnes variables', async () => {
    const { getFirestoreClient } = await import('@/lib/firebase/admin');

    getFirestoreClient();

    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockCert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'test-project',
        clientEmail: 'test@test.iam.gserviceaccount.com',
      }),
    );
  });

  it('retourne le client Firestore', async () => {
    const expectedFirestore = { collection: vi.fn() };
    mockFirestore.mockReturnValue(expectedFirestore);

    const { getFirestoreClient } = await import('@/lib/firebase/admin');
    const firestoreClient = getFirestoreClient();

    expect(firestoreClient).toBe(expectedFirestore);
  });

  it('retourne le client Storage', async () => {
    const expectedStorage = { bucket: vi.fn() };
    mockStorage.mockReturnValue(expectedStorage);

    const { getStorageClient } = await import('@/lib/firebase/admin');
    const storageClient = getStorageClient();

    expect(storageClient).toBe(expectedStorage);
  });

  it('lance une erreur si les variables Firebase sont manquantes', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const { getFirestoreClient } = await import('@/lib/firebase/admin');

    expect(() => getFirestoreClient()).toThrow(
      'Variables Firebase manquantes',
    );
  });
});
