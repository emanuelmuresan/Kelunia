"use client";

// Alegerea unei culori: pastile cu culori gata făcute, o roată de culori (nuanță și saturație) cu glisor de luminozitate și un câmp #RRGGBB;
// folosit la culoarea grupurilor și a benzii de evenimente.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { hexToHsv, hsvToHex, type Hsv } from "@/lib/color-wheel";

type ColorPickerProps = {
  value: string;
  palette: readonly string[];
  hexLabel: string;
  brightnessLabel: string;
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
export function ColorPicker({ value, palette, hexLabel, brightnessLabel, disabled = false, onChange }: ColorPickerProps) {
  // Câmpul text se sincronizează cu valoarea aleasă; o valoare completă și validă este trimisă imediat, iar la ieșire din câmp revine la ultima valabilă.
  const [hexText, setHexText] = useState(value);

  useEffect(() => {
    setHexText(value);
  }, [value]);

  // Poziția pe roată (nuanță, saturație) și luminozitatea; se resincronizează când culoarea vine din altă parte (pastilă, câmp hex).
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const wheelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hsvToHex(hsv) !== value.toLowerCase()) {
      setHsv(hexToHsv(value));
    }
  }, [hsv, value]);

  function applyHsv(next: Hsv) {
    setHsv(next);
    onChange(hsvToHex(next));
  }

  // Alege nuanța din unghiul față de centru și saturația din distanța față de centru.
  function pickFromWheel(event: PointerEvent<HTMLDivElement>) {
    const rect = wheelRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width / 2;

    applyHsv({
      h: ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360,
      s: Math.min(1, Math.hypot(dx, dy) / radius),
      v: hsv.v === 0 ? 1 : hsv.v,
    });
  }

  // De la tastatură: stânga/dreapta schimbă nuanța, sus/jos saturația.
  function handleWheelKey(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 15 : 5;

    if (event.key === "ArrowRight") {
      applyHsv({ ...hsv, h: (hsv.h + step) % 360 });
    } else if (event.key === "ArrowLeft") {
      applyHsv({ ...hsv, h: (hsv.h - step + 360) % 360 });
    } else if (event.key === "ArrowUp") {
      applyHsv({ ...hsv, s: Math.min(1, hsv.s + step / 100) });
    } else if (event.key === "ArrowDown") {
      applyHsv({ ...hsv, s: Math.max(0, hsv.s - step / 100) });
    } else {
      return;
    }

    event.preventDefault();
  }

  const thumbAngle = (hsv.h * Math.PI) / 180;

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

      <div className="color-picker-wheel-row">
        <div
          aria-label={hexLabel}
          aria-valuemax={360}
          aria-valuemin={0}
          aria-valuenow={Math.round(hsv.h)}
          aria-valuetext={value}
          className={`color-picker-wheel${disabled ? " disabled" : ""}`}
          onKeyDown={handleWheelKey}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            pickFromWheel(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) {
              pickFromWheel(event);
            }
          }}
          ref={wheelRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
        >
          <span
            className="color-picker-wheel-thumb"
            style={{
              backgroundColor: value,
              left: `${50 + 50 * hsv.s * Math.sin(thumbAngle)}%`,
              top: `${50 - 50 * hsv.s * Math.cos(thumbAngle)}%`,
            }}
          />
        </div>

        <label className="color-picker-brightness">
          <span>{brightnessLabel}</span>
          <input
            disabled={disabled}
            max={100}
            min={0}
            onChange={(event) => applyHsv({ ...hsv, v: Number(event.target.value) / 100 })}
            style={{ background: `linear-gradient(to right, #000, ${hsvToHex({ ...hsv, v: 1 })})` }}
            type="range"
            value={Math.round(hsv.v * 100)}
          />
        </label>
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
