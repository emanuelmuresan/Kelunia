"use client";

import { useCallback } from "react";

import { useAuth } from "@/context/AuthContext";
import { appText, type UiCopyKey } from "@/lib/i18n/app-copy-catalog";

export type AppTextVars = Record<string, string | number>;

/** Translator bound to the signed-in user's language, with {{placeholder}} interpolation. */
export function useAppText() {
  const { profile } = useAuth();
  const language = profile?.language ?? "ro";

  return useCallback(
    (key: UiCopyKey, vars?: AppTextVars) => {
      let text: string = appText(language, key);

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
