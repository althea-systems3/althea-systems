import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_LOGS_ACTIVITE } from '@/lib/carousel/constants';

export async function logAdminActivity(
  userId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const firestore = getFirestoreClient();

    await firestore.collection(FIRESTORE_LOGS_ACTIVITE).add({
      user_id: userId,
      action,
      details: details ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur journalisation activité admin', { error, action });
  }
}
