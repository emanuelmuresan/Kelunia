"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";
import { appText } from "@/lib/i18n/app-copy-catalog";

export type ConfirmOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// Without a provider (tests, isolated renders) fall back to the browser prompt.
const fallbackConfirm: ConfirmFn = async ({ message }) =>
  typeof window === "undefined" ? false : window.confirm(message);

const ConfirmContext = createContext<ConfirmFn>(fallbackConfirm);

export function useConfirm() {
  return useContext(ConfirmContext);
}

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

/** One in-app confirmation dialog for every irreversible action (replaces window.confirm). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const language = profile?.language ?? "ro";
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    []
  );

  function settle(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) {
      return;
    }

    confirmButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        pending?.resolve(false);
        setPending(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="modal-backdrop modal-backdrop-nested" role="presentation" onMouseDown={() => settle(false)}>
          <section
            className="modal-card small-card confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-message"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {pending.title && <h2>{pending.title}</h2>}
            <p id="confirm-dialog-message">{pending.message}</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => settle(false)} type="button">
                {pending.cancelLabel ?? appText(language, "action.cancel")}
              </button>
              <button
                className={pending.tone === "danger" ? "danger-button" : "primary-button"}
                onClick={() => settle(true)}
                ref={confirmButtonRef}
                type="button"
              >
                {pending.confirmLabel ?? appText(language, "action.confirm")}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Backdrop/Esc dismissal for editors: closes at once when clean, asks before dropping unsaved edits. */
export function useDismissGuard(dirty: boolean, onClose: () => void, language: Parameters<typeof appText>[0] = "ro") {
  const confirmAction = useConfirm();

  return useCallback(async () => {
    if (!dirty) {
      onClose();
      return;
    }

    const discard = await confirmAction({
      message: appText(language, "confirm.discardChanges"),
      confirmLabel: appText(language, "confirm.discardAction"),
      cancelLabel: appText(language, "confirm.keepEditing"),
      tone: "danger",
    });

    if (discard) {
      onClose();
    }
  }, [confirmAction, dirty, language, onClose]);
}
