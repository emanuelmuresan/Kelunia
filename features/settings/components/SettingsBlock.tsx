import type { ReactNode } from "react";

type SettingsBlockProps = {
  title: string;
  hint?: string;
  children: ReactNode;
};

/** A titled, bordered group so unrelated settings read as separate things. */
export function SettingsBlock({ title, hint, children }: SettingsBlockProps) {
  return (
    <section className="settings-block">
      <h4>{title}</h4>
      {hint && <small className="muted-note">{hint}</small>}
      {children}
    </section>
  );
}
