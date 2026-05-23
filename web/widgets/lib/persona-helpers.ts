import type { Motivations, Triangle3F } from "../../lib/types";
import { MOTIVATIONS_PL, MOTIVATION_KEYS } from "../../lib/types";

export type Triangle3FAxis = "fuck" | "food" | "friends";

const AXIS_LABELS: Record<Triangle3FAxis, string> = {
  fuck: "Fuck",
  food: "Food",
  friends: "Friends",
};

export function dominantAxis(t: Triangle3F): { key: Triangle3FAxis; label: string; value: number } {
  const entries: Array<[Triangle3FAxis, number]> = [
    ["fuck", t.fuck],
    ["food", t.food],
    ["friends", t.friends],
  ];
  const [key, value] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return { key, label: AXIS_LABELS[key], value };
}

export function topMotivation(m: Motivations): { key: keyof Motivations; label: string; value: number } {
  const best = MOTIVATION_KEYS.reduce(
    (acc, key) => (m[key] > acc.value ? { key, value: m[key] } : acc),
    { key: MOTIVATION_KEYS[0], value: m[MOTIVATION_KEYS[0]] },
  );
  return { key: best.key, label: MOTIVATIONS_PL[best.key], value: best.value };
}

export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
