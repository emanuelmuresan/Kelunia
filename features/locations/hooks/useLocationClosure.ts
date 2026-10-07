"use client";

// Închiderea unei locații prin funcțiile cloud: cerere (cu scrierea numelui locației ca să se confirme) și anulare în perioada de grație.
// Locația devine doar pentru citire 30 de zile, apoi datele ei sunt șterse de funcția programată purgeClosedLocations.
import { useState } from "react";
import { httpsCallable } from "firebase/functions";

import { useAppText } from "@/features/shell/hooks/useAppText";
import { cloudFunctions } from "@/lib/firebase";

// Parametrii: locația și funcția care afișează mesajul de succes.
type UseLocationClosureParams = {
  locationId: string;
  onMessage: (text: string) => void;
};

// Extrage motivul eșecului trimis de funcția cloud (ex. numele nu se potrivește).
function failureReason(error: unknown) {
  return (error as { details?: { reason?: string } } | null)?.details?.reason;
}

/** Close a location (30 days read-only, then purged) or reopen it during that grace period. */
// Hook-ul închiderii.
export function useLocationClosure({ locationId, onMessage }: UseLocationClosureParams) {
  const msg = useAppText();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  // Cere închiderea; serverul verifică numele introdus față de numele locației.
  async function requestClosure(confirmationName: string) {
    setWorking(true);
    setError("");

    try {
      await httpsCallable(cloudFunctions, "requestLocationClosure")({ locationId, confirmationName });
      onMessage(msg("msg.closureRequested"));
      return true;
    } catch (closureError) {
      console.warn("Locația nu a putut fi închisă:", closureError);
      setError(failureReason(closureError) === "name-mismatch" ? msg("msg.closureNameMismatch") : msg("msg.closureFailed"));
      return false;
    } finally {
      setWorking(false);
    }
  }

  // Redeschide locația cât timp mai este în perioada de grație.
  async function cancelClosure() {
    setWorking(true);
    setError("");

    try {
      await httpsCallable(cloudFunctions, "cancelLocationClosure")({ locationId });
      onMessage(msg("msg.closureCancelled"));
      return true;
    } catch (closureError) {
      console.warn("Locația nu a putut fi redeschisă:", closureError);
      setError(msg("msg.reopenFailed"));
      return false;
    } finally {
      setWorking(false);
    }
  }

  return { working, error, clearError: () => setError(""), requestClosure, cancelClosure };
}
