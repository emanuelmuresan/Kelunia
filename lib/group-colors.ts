import type { CSSProperties } from "react";
import type { GroupItem } from "@/lib/types/domain";

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

export function normalizeGroupColor(value: unknown) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "";
}

export function groupColorForName(groups: GroupItem[], groupName: string) {
  const name = groupName.trim();
  if (!name) {
    return "";
  }

  return normalizeGroupColor(groups.find((group) => group.name === name)?.color);
}

export function groupColorStyle(color: string): CSSProperties | undefined {
  const normalizedColor = normalizeGroupColor(color);

  if (!normalizedColor) {
    return undefined;
  }

  return {
    "--group-color": normalizedColor,
  } as CSSProperties;
}
