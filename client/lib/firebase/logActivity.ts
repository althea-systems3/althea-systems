import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_LOGS_ACTIVITE } from '@/lib/carousel/constants';

const LOG_ADMIN_ACTIVITY_TIMEOUT_MS = 3000;

export async function logAdminActivity(
  userId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const firestore = getFirestoreClient();

    const writePromise = firestore.collection(FIRESTORE_LOGS_ACTIVITE).add({
      user_id: userId,
      action,
      details: details ?? null,
      timestamp: new Date().toISOString(),
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('logAdminActivity timeout')),
        LOG_ADMIN_ACTIVITY_TIMEOUT_MS,
      );
    });

    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    console.error('Erreur journalisation activité admin', {
      error: error instanceof Error ? error.message : String(error),
      action,
    });
  }
}
