/**
 * Tkaczyk Framework — single source of truth for persona dimensions.
 *
 * Source material: PRPs/ideas/jak_napisac_dobry_tekst.md.
 *
 * Imported by:
 * - src/ai/persona-prompts.ts (system prompts inject these labels)
 * - src/tools/* (validation + Markdown export)
 * - web/widgets/components/* (UI labels)
 *
 * Polish terminology is preserved per `feedback_polish_market` — framework
 * fidelity requires the source-material vocabulary.
 */

export const MASLOW_TIERS_PL = [
  "fizjologiczne",    // 1
  "bezpieczeństwo",   // 2
  "przynależność",    // 3
  "uznanie",          // 4
  "samorealizacja",   // 5
] as const;

export type MaslowLevel = 1 | 2 | 3 | 4 | 5;

export const MOTIVATIONS_PL = {
  pain: "Ból",
  pleasure: "Przyjemność",
  fear: "Strach",
  hope: "Nadzieja",
  belonging: "Przynależność",
  rejection: "Odrzucenie",
} as const;

export type MotivationKey = keyof typeof MOTIVATIONS_PL;

export const MOTIVATION_KEYS: readonly MotivationKey[] = [
  "pain", "pleasure", "fear", "hope", "belonging", "rejection",
] as const;

export const TRIANGLE_3F_AXES = ["fuck", "food", "friends"] as const;
export type TriangleAxis = (typeof TRIANGLE_3F_AXES)[number];

export const FRAME_TYPES = ["aspirational", "pain", "social"] as const;
export type FrameType = (typeof FRAME_TYPES)[number];

export const FRAME_TYPE_LABELS_PL: Record<FrameType, string> = {
  aspirational: "Aspiracyjna",
  pain: "Bólu",
  social: "Społeczna",
};

export const EMPATHY_KEYS = ["sees", "hears", "feels", "says", "does"] as const;
export type EmpathyKey = (typeof EMPATHY_KEYS)[number];

export const EMPATHY_LABELS_PL: Record<EmpathyKey, string> = {
  sees: "Widzi",
  hears: "Słyszy",
  feels: "Czuje",
  says: "Mówi",
  does: "Robi",
};

export const GENDER_VALUES = ["female", "male", "nonbinary", "other"] as const;
export type Gender = (typeof GENDER_VALUES)[number];
