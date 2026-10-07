"use client";

// Hook pentru texte traduse în limba utilizatorului conectat.
import { useCallback } from "react";

import { useAuth } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

// Variabilele care înlocuiesc {{nume}} din text.
export type AppTextVars = Record<string, string | number>;

/** Translator bound to the signed-in user's language, with {{placeholder}} interpolation. */
export function useAppText() {
  const { profile } = useAuth();
  const language = profile?.language ?? "ro";

  // Returnează funcția de traducere; limba vine din profil (română implicit).
  return useCallback(
    (key: UiCopyKey, vars?: AppTextVars) => {
      let text: string = appText(language, key);

      // Înlocuiește fiecare {{variabilă}} cu valoarea ei.
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{{${name}}}`).join(String(value));
        }
      }

      return text;
    },
    [language]
  );
}
