// Culorile grupurilor: paleta predefinită și funcții care validează o culoare și o transformă în stil CSS.
import type { CSSProperties } from "react";
import type { GroupItem } from "@/lib/types/domain";

// Paleta din care se propun culorile grupurilor.
export const groupColorPalette = [
  "#10b8d7",
  "#1787ff",
  "#8b5cf6",
  "#e35df4",
  "#b9503d",
  "#a86716",
  "#078eaa",
  "#1764d8",
];

// Acceptă doar culori hexadecimale de forma #rrggbb; altfel returnează șir gol.
export function normalizeGroupColor(value: unknown) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "";
}

// Culoarea unui grup după nume, sau șir gol dacă grupul nu există sau nu are culoare.
export function groupColorForName(groups: GroupItem[], groupName: string) {
  const name = groupName.trim();
  if (!name) {
    return "";
  }

  return normalizeGroupColor(groups.find((group) => group.name === name)?.color);
}

// Stil inline cu variabila CSS --group-color, folosită de calendar pentru a colora rezervările grupului.
export function groupColorStyle(color: string): CSSProperties | undefined {
  const normalizedColor = normalizeGroupColor(color);

  if (!normalizedColor) {
    return undefined;
  }

  return {
    "--group-color": normalizedColor,
  } as CSSProperties;
}
