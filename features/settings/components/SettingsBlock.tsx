// Un bloc de setări cu titlu, indiciu opțional și (opțional) un buton în antet, de exemplu „Modifică” sau „Deschide” doar pentru acest bloc.
// Folosit în toate ferestrele de setări ca să separe setările fără legătură între ele.
import type { ReactNode } from "react";

type SettingsBlockProps = {
  title: string;
  hint?: string;
  /** Header button, e.g. "Modifică" for this block alone. */
  action?: ReactNode;
  children: ReactNode;
};

/** A titled, bordered group so unrelated settings read as separate things. */
export function SettingsBlock({ title, hint, action, children }: SettingsBlockProps) {
  return (
    <section className="settings-block">
      <div className="settings-block-head">
        <h4>{title}</h4>
        {action}
      </div>
      {hint && <small className="muted-note">{hint}</small>}
      {children}
    </section>
  );
}
