/**
 * Output payload types for Persona & Mapa Empatii MCP tools.
 *
 * These are TypeScript interfaces (not Zod schemas) — tool handlers produce
 * already-validated payloads from internal sources (D1 reads, AI generation
 * wrapped by `src/ai/persona-generator.ts`). MCP SDK accepts plain objects
 * in `structuredContent`; we do not need runtime parsing at the boundary.
 *
 * @module schemas/outputs
 */

import type {
  EmpathyKey,
  FrameType,
  Gender,
  MaslowLevel,
  MotivationKey,
  TriangleAxis,
} from "../framework";

/** 3F triangle weights — sum to 100 across the three axes. */
export type Triangle3F = Record<TriangleAxis, number>;

/** Six independent motivation weights (0–100 each, NOT normalized). */
export type Motivations = Record<MotivationKey, number>;

/** Sensory empathy map — five short text fields. */
export type EmpathyMap = Record<EmpathyKey, string>;

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
  | { mode: "list"; personas: PersonaListItem[] };

export interface ExportPersonaPayload {
  content: string;
  filename: string;
  byte_count: number;
}
