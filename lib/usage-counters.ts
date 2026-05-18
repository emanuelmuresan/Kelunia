import { doc, increment, Timestamp, updateDoc, type Firestore } from "firebase/firestore";
import type { LocationCounterName } from "@/lib/types/domain";

export async function updateLocationCounter(
  db: Firestore,
  locationId: string,
  counterName: LocationCounterName,
  delta: 1 | -1
) {
  if (!locationId) {
    return;
  }

  await updateDoc(doc(db, "locations", locationId), {
    [`usage.${counterName}`]: increment(delta),
    updatedAt: Timestamp.now(),
  });
}

export async function updateLocationCounterSafely(
  db: Firestore,
  locationId: string,
  counterName: LocationCounterName,
  delta: 1 | -1
) {
  try {
    await updateLocationCounter(db, locationId, counterName, delta);
  } catch (error) {
    console.warn(`Counterul ${counterName} nu a putut fi actualizat:`, error);
  }
}
