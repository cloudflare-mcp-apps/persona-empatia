/**
 * Widget-side types for Persona & Mapa Empatii.
 *
 * Mirrors `src/schemas/outputs.ts` minimally — Vite/Rollup tree-shakes server
 * code, but we keep these standalone to avoid TS resolution issues across the
 * widget/server boundary.
 */

export type MaslowLevel = 1 | 2 | 3 | 4 | 5;
export type Gender = "female" | "male" | "nonbinary" | "other";
export type FrameType = "aspirational" | "pain" | "social";

export interface Triangle3F {
  fuck: number;
  food: number;
  friends: number;
}

export interface Motivations {
  pain: number;
  pleasure: number;
  fear: number;
  hope: number;
  belonging: number;
  rejection: number;
}

export interface EmpathyMap {
  sees: string;
  hears: string;
  feels: string;
  says: string;
  does: string;
}

export interface PersonaPayload {
  persona_id: string;
  name: string;
  age: number;
  gender: Gender;
  location: string;
  profession: string;
  business: string;
  hints: string | null;
  maslow_level: MaslowLevel;
  triangle_3f: Triangle3F;
  motivations: Motivations;
  empathy_map: EmpathyMap;
  deep_need: string | null;
  pains: string[];
  dreams: string[];
  created_at: string;
  updated_at: string;
}

export interface FramePayload {
  frame_id: string;
  persona_id: string;
  frame_type: FrameType;
  text: string;
  framework_note: string;
  product_hook: string | null;
  generated_at: string;
}

export interface PersonaListItem {
  persona_id: string;
  name: string;
  business: string;
  updated_at: string;
}

export type LoadPersonaPayload =
  | (PersonaPayload & { mode: "single" })
  | { mode: "list"; personas: PersonaListItem[] }
  | { mode: "not_found"; persona_id: string };

export interface ExportPersonaPayload {
  content: string;
  filename: string;
  byte_count: number;
}

export type PersonaDelta = Partial<Omit<PersonaPayload,
  "persona_id" | "business" | "hints" | "created_at" | "updated_at"
>>;

export type RegenDimension = "empathy_map" | "pains" | "dreams" | "deep_need";

/** Framework labels — duplicated here to keep widget bundle independent of server tree. */
export const MASLOW_TIERS_PL = [
  "fizjologiczne",
  "bezpieczeństwo",
  "przynależność",
  "uznanie",
  "samorealizacja",
] as const;

export const MOTIVATIONS_PL: Record<keyof Motivations, string> = {
  pain: "Ból",
  pleasure: "Przyjemność",
  fear: "Strach",
  hope: "Nadzieja",
  belonging: "Przynależność",
  rejection: "Odrzucenie",
};

export const MOTIVATION_KEYS: Array<keyof Motivations> = [
  "pain", "pleasure", "fear", "hope", "belonging", "rejection",
];

export const EMPATHY_LABELS_PL: Record<keyof EmpathyMap, string> = {
  sees: "Widzi",
  hears: "Słyszy",
  feels: "Czuje",
  says: "Mówi",
  does: "Robi",
};

export const EMPATHY_KEYS: Array<keyof EmpathyMap> = ["sees", "hears", "feels", "says", "does"];

export const FRAME_TYPE_LABELS_PL: Record<FrameType, string> = {
  aspirational: "Aspiracyjna",
  pain: "Bólu",
  social: "Społeczna",
};
