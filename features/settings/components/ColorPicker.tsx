"use client";

// Alegerea unei culori: pastile cu culori gata făcute și un câmp #RRGGBB; folosit la culoarea grupurilor și a benzii de evenimente.
import { useEffect, useState } from "react";

type ColorPickerProps = {
  value: string;
  palette: readonly string[];
  hexLabel: string;
  disabled?: boolean;
  onChange: (hex: string) => void;
};

// Formatul acceptat pentru culoare: șase cifre hexazecimale.
const hexPattern = /^#[0-9a-f]{6}$/i;

/**
 * Inline colour choice: ready-made swatches plus a #RRGGBB field. No browser or
 * OS colour popup, so what is picked is visible at once and is saved with the
 * surrounding form's own Save button.
 */
export function ColorPicker({ value, palette, hexLabel, disabled = false, onChange }: ColorPickerProps) {
  // Câmpul text se sincronizează cu valoarea aleasă; o valoare completă și validă este trimisă imediat, iar la ieșire din câmp revine la ultima valabilă.
  const [hexText, setHexText] = useState(value);

  useEffect(() => {
    setHexText(value);
  }, [value]);

  return (
    <div className="color-picker">
      <div className="color-picker-swatches">
        {palette.map((color) => (
          <button
            aria-label={color}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            className={value.toLowerCase() === color.toLowerCase() ? "active" : ""}
            disabled={disabled}
            key={color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            type="button"
          />
        ))}
      </div>

      <label className="color-picker-hex">
        <span>{hexLabel}</span>
        <input
          disabled={disabled}
          inputMode="text"
          maxLength={7}
          placeholder="#1787ff"
          value={hexText}
          onChange={(event) => {
            const next = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`;
            setHexText(next);

            if (hexPattern.test(next)) {
              onChange(next.toLowerCase());
            }
          }}
          onBlur={() => setHexText(value)}
        />
      </label>
    </div>
  );
}
