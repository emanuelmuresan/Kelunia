"use client";

import type { SpaceEditor } from "@/lib/types/domain";
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
              placeholder={isRoom ? "ex. Sala mica" : "ex. Grupa 1"}
              onChange={(event) =>
                onChange({
                  ...spaceEditor,
                  name: event.target.value,
                })
              }
            />
          </label>

          {!isRoom && (
            <label>
              {appText(language, "settings.color")}
              <div className="group-color-picker">
                {groupColorPalette.map((color) => (
                  <button
                    aria-label={`${appText(language, "settings.color")} ${color}`}
                    className={normalizeGroupColor(spaceEditor.color) === color ? "active" : ""}
                    key={color}
                    onClick={() => onChange({ ...spaceEditor, color })}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
                <input
                  aria-label={appText(language, "settings.customColor")}
                  type="color"
                  value={normalizeGroupColor(spaceEditor.color) || groupColorPalette[0]}
                  onChange={(event) =>
                    onChange({
                      ...spaceEditor,
                      color: event.target.value,
                    })
                  }
                />
              </div>
            </label>
          )}

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
