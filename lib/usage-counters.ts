// Contoare de utilizare ale unei locații (câte camere, grupuri etc.), folosite pentru limitele planului.
// Contorul se modifică atomic cu increment(), fără citire prealabilă.
import { doc, increment, Timestamp, updateDoc, type Firestore } from "firebase/firestore";
import type { LocationCounterName } from "@/lib/types/domain";

// Modifică un contor cu +1 sau -1; fără id de locație nu face nimic.
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

// Varianta „sigură”: o eroare la contor este doar avertizată și nu oprește acțiunea principală a utilizatorului.
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
