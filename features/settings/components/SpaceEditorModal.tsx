"use client";

import type { SpaceEditor } from "@/lib/types/domain";
import { ColorPicker } from "@/features/settings/components/ColorPicker";
import { SettingsBlock } from "@/features/settings/components/SettingsBlock";
import { dateKey } from "@/lib/dates";
import { groupColorPalette, normalizeGroupColor } from "@/lib/group-colors";
import { appText, type SupportedLocale } from "@/lib/i18n/app-copy-catalog";

type SpaceEditorModalProps = {
  spaceEditor: SpaceEditor | null;
  spaceError: string;
  groupLabel?: string;
  roomLabel?: string;
  language?: SupportedLocale;
  onClose: () => void;
  onChange: (value: SpaceEditor) => void;
  onSave: () => void;
};

export function SpaceEditorModal({
  spaceEditor,
  spaceError,
  groupLabel = "Grup",
  roomLabel = "Sala",
  language = "ro",
  onClose,
  onChange,
  onSave,
}: SpaceEditorModalProps) {
  if (!spaceEditor) {
    return null;
  }

  const isRoom = spaceEditor.kind === "room";
  const itemLabel = isRoom ? roomLabel : groupLabel;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card small-card"
        role="dialog"
        aria-modal="true"
        aria-label={appText(language, "settings.space")}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{itemLabel}</span>

            <h2>
              {(spaceEditor.id ? appText(language, "settings.editSpace") : appText(language, "settings.addSpace"))
                .replace("{{item}}", itemLabel.toLowerCase())}
            </h2>
          </div>

          <button onClick={onClose} type="button" aria-label={appText(language, "booking.close")}>
            ×
          </button>
        </div>

        <div className="settings-form">
          <label>
            {appText(language, "settings.name")}
            <input
              autoFocus
              value={spaceEditor.name}
              placeholder={appText(language, isRoom ? "settings.spacePlaceholderRoom" : "settings.spacePlaceholderGroup")}
              onChange={(event) =>
                onChange({
                  ...spaceEditor,
                  name: event.target.value,
                })
              }
            />
          </label>

          {!isRoom && (
            <div className="color-field">
              <span>{appText(language, "settings.color")}</span>
              <ColorPicker
                hexLabel={appText(language, "settings.colorHex")}
                palette={groupColorPalette}
                value={normalizeGroupColor(spaceEditor.color) || groupColorPalette[0]}
                onChange={(color) => onChange({ ...spaceEditor, color })}
              />
            </div>
          )}

          <SettingsBlock title={appText(language, "settings.blockPeriod")}>
          <label className="toggle-row compact-toggle">
            <input
              type="checkbox"
              checked={Boolean(spaceEditor.activeUntil)}
              onChange={(event) =>
                onChange({
                  ...spaceEditor,
                  activeUntil: event.target.checked ? dateKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : "",
                })
              }
            />
            {appText(language, "settings.temporary")}
          </label>

          {spaceEditor.activeUntil ? (
            <label>
              {appText(language, "settings.activeUntil")}
              <input
                type="date"
                value={spaceEditor.activeUntil}
                min={dateKey(new Date())}
                onChange={(event) => onChange({ ...spaceEditor, activeUntil: event.target.value })}
              />
              <small className="muted-note">{appText(language, "settings.temporaryHint")}</small>
            </label>
          ) : null}
          </SettingsBlock>

          {spaceError && <p className="error-line">{spaceError}</p>}

          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              {appText(language, "action.cancel")}
            </button>

            <button className="primary-button" onClick={onSave} type="button">
              {spaceEditor.id ? appText(language, "action.save") : appText(language, "booking.add")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
