import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_LOGS_ACTIVITE } from '@/lib/carousel/constants';

export async function logAuthActivity(
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const firestore = getFirestoreClient();

    await firestore.collection(FIRESTORE_LOGS_ACTIVITE).add({
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erreur journalisation activité auth', {
      error,
      action,
    });
  }
}
