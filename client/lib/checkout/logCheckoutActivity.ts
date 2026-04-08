import { getFirestoreClient } from '@/lib/firebase/admin';
import { FIRESTORE_LOGS_ACTIVITE } from '@/lib/carousel/constants';

export async function logCheckoutActivity(
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
    console.error('Erreur journalisation activité checkout', {
      error,
      action,
    });
  }
}
