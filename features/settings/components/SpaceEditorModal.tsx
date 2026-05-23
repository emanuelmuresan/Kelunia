"use client";

import type { SpaceEditor } from "@/lib/types/domain";
import { groupColorPalette, normalizeGroupColor } from "@/lib/group-colors";

type SpaceEditorModalProps = {
  spaceEditor: SpaceEditor | null;
  spaceError: string;
  groupLabel?: string;
  roomLabel?: string;
  onClose: () => void;
  onChange: (value: SpaceEditor) => void;
  onSave: () => void;
};

export function SpaceEditorModal({
  spaceEditor,
  spaceError,
  groupLabel = "Grup",
  roomLabel = "Sala",
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
        aria-label="Administrare spațiu"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">{itemLabel}</span>

            <h2>
              {spaceEditor.id ? `Editeaza ${itemLabel.toLowerCase()}` : `Adauga ${itemLabel.toLowerCase()}`}
            </h2>
          </div>

          <button onClick={onClose} type="button" aria-label="Închide">
            ×
          </button>
        </div>

        <div className="settings-form">
          <label>
            Nume
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
              Culoare
              <div className="group-color-picker">
                {groupColorPalette.map((color) => (
                  <button
                    aria-label={`Alege culoarea ${color}`}
                    className={normalizeGroupColor(spaceEditor.color) === color ? "active" : ""}
                    key={color}
                    onClick={() => onChange({ ...spaceEditor, color })}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
                <input
                  aria-label="Culoare personalizată"
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
              Anulează
            </button>

            <button className="primary-button" onClick={onSave} type="button">
              {spaceEditor.id ? "Salvează" : "Adaugă"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
