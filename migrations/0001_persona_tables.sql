-- Persona & Mapa Empatii — D1 schema migration
--
-- Database: mcp-oauth (shared, ID eac93639-d58e-4777-82e9-f1e28113d5b2).
-- Tables namespaced with `persona_` prefix to avoid collision with shared `users` table.
--
-- Per PRP §3.6 — two tables (personas + frames) with cascade FK + 2 indexes.

CREATE TABLE IF NOT EXISTS persona_personas (
  user_id           TEXT NOT NULL,
  persona_id        TEXT NOT NULL,
  name              TEXT NOT NULL,
  age               INTEGER NOT NULL CHECK (age BETWEEN 13 AND 99),
  gender            TEXT NOT NULL CHECK (gender IN ('female','male','nonbinary','other')),
  location          TEXT NOT NULL,
  profession        TEXT NOT NULL,
  business          TEXT NOT NULL,
  hints             TEXT,
  maslow_level      INTEGER NOT NULL CHECK (maslow_level BETWEEN 1 AND 5),
  triangle_3f       TEXT NOT NULL,
  motivations       TEXT NOT NULL,
  empathy_map       TEXT NOT NULL,
  deep_need         TEXT,
  pains             TEXT NOT NULL DEFAULT '[]',
  dreams            TEXT NOT NULL DEFAULT '[]',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (user_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_persona_personas_user_updated
  ON persona_personas(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS persona_frames (
  user_id           TEXT NOT NULL,
  frame_id          TEXT NOT NULL,
  persona_id        TEXT NOT NULL,
  frame_type        TEXT NOT NULL CHECK (frame_type IN ('aspirational','pain','social')),
  text              TEXT NOT NULL,
  framework_note    TEXT,
  product_hook      TEXT,
  generated_at      TEXT NOT NULL,
  PRIMARY KEY (user_id, frame_id),
  FOREIGN KEY (user_id, persona_id) REFERENCES persona_personas(user_id, persona_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_persona_frames_persona
  ON persona_frames(user_id, persona_id, generated_at DESC);
