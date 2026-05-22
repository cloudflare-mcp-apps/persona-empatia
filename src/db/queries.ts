/**
 * D1 query layer for Persona & Mapa Empatii.
 *
 * Tables (created by `migrations/0001_persona_tables.sql`):
 * - `persona_personas` (user_id, persona_id, ...JSON columns)
 * - `persona_frames` (user_id, frame_id, persona_id, ...) with cascade FK
 *
 * Single-writer concurrency: per-user persona edits — race conditions are
 * acceptable; read-modify-write does NOT wrap in a transaction (D1 doesn't
 * yet support multi-statement transactions). For atomic per-row update, we
 * use full-overwrite UPDATE statements (no SET ... = excluded patterns).
 *
 * @module db/queries
 */

import type {
  EmpathyMap,
  FramePayload,
  Motivations,
  PersonaListItem,
  PersonaPayload,
  Triangle3F,
} from "../schemas/outputs";
import type { Gender, MaslowLevel, FrameType } from "../framework";

interface PersonaRow {
  user_id: string;
  persona_id: string;
  name: string;
  age: number;
  gender: string;
  location: string;
  profession: string;
  business: string;
  hints: string | null;
  maslow_level: number;
  triangle_3f: string;
  motivations: string;
  empathy_map: string;
  deep_need: string | null;
  pains: string;
  dreams: string;
  created_at: string;
  updated_at: string;
}

interface FrameRow {
  user_id: string;
  frame_id: string;
  persona_id: string;
  frame_type: string;
  text: string;
  framework_note: string | null;
  product_hook: string | null;
  generated_at: string;
}

interface PersonaListRow {
  persona_id: string;
  name: string;
  business: string;
  updated_at: string;
}

// ============================================================================
// Mappers
// ============================================================================

function rowToPersona(row: PersonaRow): PersonaPayload {
  return {
    persona_id: row.persona_id,
    name: row.name,
    age: row.age,
    gender: row.gender as Gender,
    location: row.location,
    profession: row.profession,
    business: row.business,
    hints: row.hints,
    maslow_level: row.maslow_level as MaslowLevel,
    triangle_3f: JSON.parse(row.triangle_3f) as Triangle3F,
    motivations: JSON.parse(row.motivations) as Motivations,
    empathy_map: JSON.parse(row.empathy_map) as EmpathyMap,
    deep_need: row.deep_need,
    pains: JSON.parse(row.pains) as string[],
    dreams: JSON.parse(row.dreams) as string[],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToFrame(row: FrameRow): FramePayload {
  return {
    frame_id: row.frame_id,
    persona_id: row.persona_id,
    frame_type: row.frame_type as FrameType,
    text: row.text,
    framework_note: row.framework_note ?? "",
    product_hook: row.product_hook,
    generated_at: row.generated_at,
  };
}

// ============================================================================
// Persona writes
// ============================================================================

/** Insert a fresh persona row (called by build_persona handler). */
export async function insertPersona(
  db: D1Database,
  userId: string,
  persona: PersonaPayload,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO persona_personas (
        user_id, persona_id, name, age, gender, location, profession,
        business, hints, maslow_level, triangle_3f, motivations, empathy_map,
        deep_need, pains, dreams, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId,
      persona.persona_id,
      persona.name,
      persona.age,
      persona.gender,
      persona.location,
      persona.profession,
      persona.business,
      persona.hints,
      persona.maslow_level,
      JSON.stringify(persona.triangle_3f),
      JSON.stringify(persona.motivations),
      JSON.stringify(persona.empathy_map),
      persona.deep_need,
      JSON.stringify(persona.pains),
      JSON.stringify(persona.dreams),
      persona.created_at,
      persona.updated_at,
    )
    .run();
}

/**
 * Overwrite a persona row with the full updated payload.
 * Caller is responsible for merging delta into existing row before calling.
 */
export async function updatePersona(
  db: D1Database,
  userId: string,
  persona: PersonaPayload,
): Promise<void> {
  await db
    .prepare(
      `UPDATE persona_personas SET
        name = ?, age = ?, gender = ?, location = ?, profession = ?,
        business = ?, hints = ?, maslow_level = ?, triangle_3f = ?,
        motivations = ?, empathy_map = ?, deep_need = ?, pains = ?,
        dreams = ?, updated_at = ?
       WHERE user_id = ? AND persona_id = ?`,
    )
    .bind(
      persona.name,
      persona.age,
      persona.gender,
      persona.location,
      persona.profession,
      persona.business,
      persona.hints,
      persona.maslow_level,
      JSON.stringify(persona.triangle_3f),
      JSON.stringify(persona.motivations),
      JSON.stringify(persona.empathy_map),
      persona.deep_need,
      JSON.stringify(persona.pains),
      JSON.stringify(persona.dreams),
      persona.updated_at,
      userId,
      persona.persona_id,
    )
    .run();
}

// ============================================================================
// Persona reads
// ============================================================================

/** Get a single persona by ID for a given user. Returns null on miss. */
export async function getPersona(
  db: D1Database,
  userId: string,
  personaId: string,
): Promise<PersonaPayload | null> {
  const row = await db
    .prepare(`SELECT * FROM persona_personas WHERE user_id = ? AND persona_id = ?`)
    .bind(userId, personaId)
    .first<PersonaRow>();
  return row ? rowToPersona(row) : null;
}

/** List most-recently-updated personas (summary projection only). */
export async function listPersonas(
  db: D1Database,
  userId: string,
  limit: number,
): Promise<PersonaListItem[]> {
  const { results } = await db
    .prepare(
      `SELECT persona_id, name, business, updated_at
       FROM persona_personas
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .bind(userId, limit)
    .all<PersonaListRow>();
  return (results ?? []).map((row) => ({
    persona_id: row.persona_id,
    name: row.name,
    business: row.business,
    updated_at: row.updated_at,
  }));
}

// ============================================================================
// Frame writes + reads
// ============================================================================

export async function insertFrame(
  db: D1Database,
  userId: string,
  frame: FramePayload,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO persona_frames (
        user_id, frame_id, persona_id, frame_type, text,
        framework_note, product_hook, generated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId,
      frame.frame_id,
      frame.persona_id,
      frame.frame_type,
      frame.text,
      frame.framework_note,
      frame.product_hook,
      frame.generated_at,
    )
    .run();
}

/** Get all frames for a persona, newest first. */
export async function getFrames(
  db: D1Database,
  userId: string,
  personaId: string,
): Promise<FramePayload[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM persona_frames
       WHERE user_id = ? AND persona_id = ?
       ORDER BY generated_at DESC`,
    )
    .bind(userId, personaId)
    .all<FrameRow>();
  return (results ?? []).map(rowToFrame);
}
