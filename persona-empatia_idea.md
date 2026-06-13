# MCP Server Idea — Persona & Mapa Empatii

## 1. Server Identity

| Field | Value |
|-------|-------|
| **Human-Readable Name** | Persona & Mapa Empatii |
| **Class Name (PascalCase)** | PersonaEmpatia |
| **Server Slug (kebab-case)** | persona-empatia |

---

## 2. Project Purpose

**What problem does this server solve?**

Polish solopreneurs and copywriters know they "should build personas" before writing copy, but every available persona tool produces generic demographic cards ("kobieta 25–40, wyższe wykształcenie, miasto > 50k") that do not help anyone write a better tagline. This server replaces the demographic card with the **copywriter's persona framework** from the source material (`PRPs/ideas/jak_napisac_dobry_tekst.md`): Maslow level + 3F triangle (Fuck / Food / Friends) + 6 motivations (pain, pleasure, fear, hope, belonging, rejection) + sensory empathy map + "dlaczego dziś?" deep need. The widget walks the user through this framework interactively in under 90 seconds and returns a persona artifact that is **reusable across conversations** — the model can recall it ("napisz hero dla Małgosi") in any future session.

**Success Criteria:**

- [ ] **Median persona completion time ≤ 90 seconds** from `build_persona` call to user clicking "zapisz" — defends "70× faster than a workshop" claim.
- [ ] **≥ 40% of personas reach all 4 framework dimensions filled** (Maslow + 3F + motivations + empathy map) — proves the framework is teachable through the widget, not just decorative.
- [ ] **≥ 25% of users reference a saved persona in a follow-up conversation** within 7 days (via `load_persona`) — validates the cross-session artifact value, the core differentiator vs one-shot AI persona generators.
- [ ] **≥ 60% of generated aspirational frames are kept by the user** (not regenerated) — measured by `generate_frame` regenerate rate < 40%; proves Workers AI output quality is acceptable for production copy.

---

## 3. Server Type

- [x] **Type 1: Pure MCP App** — No external API. State is per-user in D1, pivoted on `userId` from AuthKit JWT. Domain logic = the copywriting framework (encoded in tool prompts + widget structure). LLM heavy-lifting delegated to Workers AI for persona drafts and frame generation.
- [ ] Type 2: MCP App with External API

---

## 4. Tools Definition

### Tool 1 — `build_persona` (Primary)

| Field | Value |
|-------|-------|
| **Name** | `build_persona` |
| **Description (2-part)** | Generate a copywriter's persona draft from a 1–2 sentence business description, using the Tkaczyk framework: assigned name + age + profession + location, Maslow level the product targets, 3F triangle weights, 6-motivation profile, and an initial sensory empathy map. Returns the persona JSON plus a persistent `persona_id`, then renders the interactive widget for refinement. Use when the user says "stwórz personę", "kim jest mój klient", "do kogo mam pisać", or pastes a product/business description and asks for a target audience. |
| **Input Parameters** | `business` (string, required, ≤ 500 chars — what the user sells, e.g., "kursy hiszpańskiego online dla pracujących") · `hints` (string, optional, ≤ 200 chars — known audience traits, e.g., "20–40 lat, home office") · `persona_name_hint` (string, optional — pre-set the persona's first name if the user has one in mind) |
| **Output Format** | `{ persona_id, name, age, gender, location, profession, maslow_level: 1–5, triangle_3f: { fuck, food, friends }, motivations: { pain, pleasure, fear, hope, belonging, rejection }, empathy_map: { sees, hears, feels, says, does }, deep_need: string, pains: [string], dreams: [string] }` |

### Tool 2 — `refine_persona`

| Field | Value |
|-------|-------|
| **Name** | `refine_persona` |
| **Description (2-part)** | Apply a partial update (delta) to a saved persona — used by the widget when the user moves sliders, edits fields, or asks for a regeneration of one dimension. Returns the full updated persona with `updated_at` bumped, so the widget can re-render consistently. Use when the widget triggers refinement (`callServerTool` from sliders/inputs) or the user in chat says "zmień Małgosi wiek na 35", "przesuń ją wyżej w piramidzie Maslowa". |
| **Input Parameters** | `persona_id` (string, required) · `delta` (object, required — any subset of persona fields to overwrite; numeric fields validated against bounds, 3F weights renormalized to sum 100) · `regenerate` (enum, optional: `empathy_map` \| `pains` \| `dreams` \| `deep_need` — re-run Workers AI for one dimension given other fields as context) |
| **Output Format** | Same shape as `build_persona` output. |

### Tool 3 — `generate_frame`

| Field | Value |
|-------|-------|
| **Name** | `generate_frame` |
| **Description (2-part)** | Generate a single copywriting "ramka" for a saved persona — aspirational (future success scene), pain (current pain scene), or social (belonging scene) — using Workers AI with the persona's empathy map + 3F weights + Maslow level as grounding context. Returns one frame as 2–4 sentences of sensory Polish copy plus the framework reasoning so the user understands why this frame fits this persona. Use when the user asks for "ramka aspiracyjna", "ramka bólu", "napisz scenkę", or clicks the "+ nowa ramka" button in the widget. |
| **Input Parameters** | `persona_id` (string, required) · `frame_type` (enum, required: `aspirational` \| `pain` \| `social`) · `product_hook` (string, optional, ≤ 200 chars — specific product/feature to weave in) |
| **Output Format** | `{ frame_id, frame_type, text, framework_note: string, generated_at }` — `framework_note` quotes which empathy-map fields and which 3F element drove the frame, e.g., "Wykorzystuje 'słyszy: zrób to dla siebie' + dominację Food (hedonistyczna nagroda)". |

### Tool 4 — `load_persona`

| Field | Value |
|-------|-------|
| **Name** | `load_persona` |
| **Description (2-part)** | Recall a previously built persona by ID or list the user's recent personas (default: 5 most recent) so the model can resume work in a new conversation without rebuilding from scratch. Returns the same persona shape as `build_persona` plus a list-mode response when no `persona_id` is given. Use when the user references "Małgosia z poprzedniej rozmowy", "wczorajsza persona", "moje persony", or the model needs persona context to fulfil a follow-up copywriting task. |
| **Input Parameters** | `persona_id` (string, optional — omit for list mode) · `limit` (int, optional, default 5, max 20 — applies in list mode only) |
| **Output Format** | Single mode: full persona JSON. List mode: `{ personas: [{ persona_id, name, business, updated_at }] }`. |

### Tool 5 — `export_persona`

| Field | Value |
|-------|-------|
| **Name** | `export_persona` |
| **Description (2-part)** | Serialize a persona to Markdown (workshop-friendly, headings + sections) or JSON (machine-friendly, for feeding into other tools or storage) and return it inline so the widget can trigger `app.downloadFile()` or the user can copy/paste. Does NOT write a file server-side. Use when the user asks to "wyeksportuj personę", "daj mi tę personę w markdown", or clicks the export button in the widget. |
| **Input Parameters** | `persona_id` (string, required) · `format` (enum, required: `markdown` \| `json`) |
| **Output Format** | `{ content: string, filename: 'persona-{slug}-YYYY-MM-DD.{md\|json}', byte_count }` |

**Visibility plan:**
- Model-visible (`visibility` omitted = default model+app): `build_persona`, `load_persona`.
- App-only (`_meta.ui.visibility: ["app"]`): `refine_persona`, `generate_frame`, `export_persona` — these are widget-driven interactions, exposing them to the model adds chat noise without value.

---

## 5. Widget Specification

- [x] **Yes** — The framework has 4 visual dimensions (Maslow pyramid, 3F triangle, 6 motivation bars, 5-quadrant empathy map) plus generated frame cards. Sliders + structured layout are inherently visual; without the widget this server would be a text dump.

**Widget type:** Calculator/Interactive with multi-pane custom visualizations (pyramid, triangle, bars, quadrant grid).

**Reference Implementation:**
- **Upstream (primary):** `mcp-apps/examples/scenario-modeler-server/` — multi-slider widget feeding a derived visualization with live re-render via `callServerTool`. Direct match for "sliders → re-derive persona → re-render" pattern. Read `src/mcp-app.tsx` for the `useApp()` hook, slider→state wiring, and Chart.js usage.
- **Upstream (secondary):** `mcp-apps/examples/budget-allocator-server/` — normalized weights-to-100 slider pattern (exactly what 3F triangle needs), with industry-benchmark sparkline cards reusable as 6-motivation bars.
- **Local (Cloudflare adaptations):** `projects/sustainability-auditor/` — closest sibling for multi-tab/multi-panel widget on Cloudflare Workers + AuthKit JWT + Workers AI. Mirror its `src/server.ts` (tool registration shape), `src/auth/` (dual auth pre-handler), `src/schemas/`, and Workers AI invocation pattern.

**Widget height:** `h-[500px]` fixed (Claude inline card max — 600px gets silently clipped).

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Małgosia, 28  · recepcjonistka, Łódź   [✎] [⬇ md] [×] │  ← header
├──────────────────┬──────────────────┬──────────────────┤
│  PIRAMIDA        │  TRÓJKĄT 3F      │  6 MOTYWACJI     │
│  MASLOWA         │     ▲            │  Ból     ████░  │
│  ┌─samorealiz─┐ │    /•\  ← Twój  │  Strach  ███░░  │
│  │ uznanie  ◀━┤ │   /   \  klient │  Nadzieja ███░  │
│  │ przynal.   │ │  /─────\         │  Przyjem. ██░░  │
│  │ bezpiecz.  │ │ Food    Friends │  Przynal. ████░  │
│  │ fizjolog.  │ │ ▲ Fuck           │  Odrzuc.  █░░░░  │
│  └────────────┘ │                  │                  │
├──────────────────┴──────────────────┴──────────────────┤
│  MAPA EMPATII                                          │
│ ┌Widzi───┐┌Słyszy──┐┌Czuje──┐┌Mówi────┐┌Robi────┐    │
│ │Instagra││"zrób to││presja ││"nie mam││scroll  │    │
│ │influenc││ dla    ││czasu  ││ siły"  ││TikToka │    │
│ │ fit    ││siebie" ││na sb. ││        ││przed   │    │
│ │        ││        ││       ││        ││snem    │    │
│ └────────┘└────────┘└───────┘└────────┘└────────┘    │
├─────────────────────────────────────────────────────────┤
│  "DLACZEGO DZIŚ?" (bodziec → potrzeba głęboka)         │
│  Wrocławski półmaraton za 4 miesiące. Wcześniej       │
│  biegała okazjonalnie, teraz potrzebuje planu.         │
├─────────────────────────────────────────────────────────┤
│  RAMKI                                  [+ aspir.] [+ ból] [+ społ.] │
│  ▸ Aspiracyjna · "Mijasz metę z czasem 1:55..."   [🔄][×]│
│  ▸ Bólu        · "Trzeci tydzień bez postępów..." [🔄][×]│
└─────────────────────────────────────────────────────────┘
```

**Interaction model (every interaction = one `callServerTool`):**

- **Edit field** (header pencil) → inline edit name / age / profession → `refine_persona({ delta: { name, age, ... } })`.
- **Maslow pyramid click** → set `maslow_level` (1–5) → `refine_persona({ delta: { maslow_level } })`.
- **3F dot drag** → barycentric coords map to `{fuck, food, friends}` summing 100 → `refine_persona({ delta: { triangle_3f } })`.
- **Motivation bar drag** → 0–100 each (independent, not normalized) → `refine_persona({ delta: { motivations } })`.
- **Empathy quadrant edit** → textarea edit → `refine_persona({ delta: { empathy_map: {sees: "..."} } })`. Each quadrant has a 🔄 button → `refine_persona({ regenerate: 'empathy_map' })` (regenerates all 5 fields jointly so they stay coherent).
- **Deep need 🔄** → `refine_persona({ regenerate: 'deep_need' })`.
- **+ aspir/ból/społ** → `generate_frame({ frame_type })` → appends to frames list.
- **Frame 🔄** → regenerate that frame in place; **×** → remove.
- **⬇ md** → `export_persona({ format: 'markdown' })` → `app.downloadFile()`.

**Engagement mechanics:**
- **Auto-save on every refine**: no "save" button — every slider tweak persists to D1 immediately, so the persona is never lost. Mirror of pomodoro's auto-persist.
- **Optimistic UI**: slider movements update local state instantly; server response reconciles in the background. Standard pattern in budget-allocator.
- **Coherence regeneration**: when the user changes Maslow level, the widget shows a subtle "regeneruj mapę empatii?" hint — sensory descriptors should match the need level. User opt-in, not automatic, so manual edits are not destroyed.
- **Frame cards collapsible**: tap to expand full text + `framework_note`; collapsed shows first line + reasoning chip.
- **Mobile compatibility (Tier 1)**: min-width 320 px, no popovers (clipped by container), touch targets ≥ 44 pt per `widget-patterns.md`. 3F triangle dot supports touch drag.
- **`updateModelContext` on every refine**: pushes a concise persona summary (name, business, Maslow level, 3F dominant, deep need) into the conversation so the model can reference the persona without an extra `load_persona` round-trip in immediate follow-ups.

**Language:** All widget UI text in **Polish**. Code, comments, tool descriptions stay English (per `feedback_polish_market`).

---

## 6. Prompt Definition

### Primary Prompt — `nowa-persona`

| Field | Value |
|-------|-------|
| **Prompt ID** | `nowa-persona` |
| **Title** | Stwórz personę copywriterską dla mojego biznesu |
| **Description** | Guided 30-second onboarding: ask the user one or two questions in Polish ("Co sprzedajesz? Komu — choć jedna wskazówka demograficzna lub kontekstowa?"), assemble the answers into a `business` + `hints` payload, then call `build_persona`. Sets up the widget with a pre-filled draft so the user lands directly in refinement, not blank-page anxiety. |
| **Parameters** | none (the user's answers in chat populate the tool args) |
| **Tool(s) Invoked** | `build_persona({ business, hints?, persona_name_hint? })` — single call. |

### Additional Prompt — `przepisz-z-persona`

| Field | Value |
|-------|-------|
| **Prompt ID** | `przepisz-z-persona` |
| **Title** | Przepisz mój tekst pod konkretną personę |
| **Description** | Uses the user's own LLM (not Workers AI) to rewrite a pasted copy snippet using a loaded persona as constraint set. The prompt template loads the persona via `load_persona`, then asks the LLM in Polish to (1) name 2 framework elements the original ignores, (2) propose a rewrite, (3) flag remaining filler words ("słowa wytrychy"). Zero inference cost on our worker. |
| **Parameters** | `persona_id` (string, required — passed by user or model from recent context) · `copy` (string, required — the text to rewrite, ≤ 1000 chars enforced in prompt template) |
| **Tool(s) Invoked** | `load_persona({ persona_id })` → prompt template injects persona + copy into the user's LLM context with framework instructions. |

**Rationale — why Workers AI for persona generation but NOT for rewrite:**

- `build_persona` / `generate_frame` need **structured, framework-grounded output** with deterministic JSON shape — small, cheap Workers AI calls with strict system prompts work well and avoid burning user tokens.
- `przepisz-z-persona` is **conversational, iterative, context-aware** — the user's own LLM already holds the chat history (previous personas, prior rewrites, user feedback) and the user pays for that inference. Delegating via MCP Prompt is the idiomatic split.

**Do not propose Sampling.** It is being removed from the protocol (SEP-2577 Final 2026-04-14 — see `lesson_sampling_unsupported` in memory).

---

## 7. Optional Features

- [x] **Workers AI** — Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Use cases: (a) persona draft in `build_persona` — structured JSON output, single call ~600 tokens; (b) targeted regeneration in `refine_persona` (one dimension at a time — keeps cost low and other manual edits intact); (c) sensory frame in `generate_frame` — 2–4 sentence Polish copy, ~200 tokens out. Strict JSON-schema system prompt for (a)/(b); free-form Polish for (c).
- [ ] **Caching (KV)** — not needed; D1 reads are per-user and tiny (one persona row per query, even list mode caps at 20).
- [ ] **Workflows** — not needed; longest tool call is `build_persona` (Workers AI ~2 s) which is well within request budget.
- [ ] **R2 Storage** — not needed; exports are returned inline as strings, no server-side files.
- [ ] **Browser Rendering** — not needed.

---

## 8. Statefulness

- [x] **Stateful** — D1 schema pivoted on `userId` from AuthKit JWT. Personas are the entire product value: they must persist across conversations.

**Tables:**

```sql
CREATE TABLE personas (
  user_id           TEXT NOT NULL,
  persona_id        TEXT NOT NULL,           -- ULID, generated server-side
  name              TEXT NOT NULL,
  age               INTEGER,
  gender            TEXT,
  location          TEXT,
  profession        TEXT,
  business          TEXT NOT NULL,           -- original input from build_persona
  hints             TEXT,                    -- original hints
  maslow_level      INTEGER NOT NULL CHECK (maslow_level BETWEEN 1 AND 5),
  triangle_3f       TEXT NOT NULL,           -- JSON {fuck, food, friends} sum 100
  motivations       TEXT NOT NULL,           -- JSON 6 weights 0-100
  empathy_map       TEXT NOT NULL,           -- JSON {sees, hears, feels, says, does}
  deep_need         TEXT,
  pains             TEXT,                    -- JSON array
  dreams            TEXT,                    -- JSON array
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (user_id, persona_id)
);

CREATE INDEX idx_personas_user_updated ON personas (user_id, updated_at DESC);

CREATE TABLE frames (
  user_id           TEXT NOT NULL,
  frame_id          TEXT NOT NULL,           -- ULID
  persona_id        TEXT NOT NULL,
  frame_type        TEXT NOT NULL CHECK (frame_type IN ('aspirational','pain','social')),
  text              TEXT NOT NULL,
  framework_note    TEXT,
  product_hook      TEXT,
  generated_at      TEXT NOT NULL,
  PRIMARY KEY (user_id, frame_id),
  FOREIGN KEY (user_id, persona_id) REFERENCES personas(user_id, persona_id) ON DELETE CASCADE
);

CREATE INDEX idx_frames_persona ON frames (user_id, persona_id, generated_at DESC);
```

**Why two tables, not one:** frames are append-only artifacts that survive persona edits (a slider tweak should not invalidate previously approved frames). Cascade delete keeps cleanup trivial when the user deletes a persona.

**ULID over UUID:** lexicographically sortable, monotonic — `ORDER BY persona_id DESC` works as a recency proxy without indexing `updated_at` separately (we still keep `updated_at` for human display).

**Widget state (non-server):** which frame card is expanded — `localStorage` via `viewUUID`. Never persist persona fields client-side; D1 is the single source of truth (avoids drift on multi-device use).

---

## Lead-Magnet Design Notes

(Outside template scope but justifies the choice over alternatives — see chat with user.)

1. **Framework-bound, not generic AI**: every other "AI persona generator" produces a demographic card. This one is bound to a specific, named, defensible framework (Tkaczyk / Mimisbrunnr — Polish marketing institution). The differentiator is in the tool descriptions + system prompts + widget structure, not the LLM.
2. **Cross-session artifact value**: `load_persona` is the retention hook — once a user has 3 personas saved, returning to the assistant becomes the path of least resistance for any copy task. No other persona tool offers this MCP-native recall.
3. **Reusable downstream**: persona JSON exported by `export_persona` is the input format for a future `audyt-copy` server (Idea A from chat — Lejek Tekstu). One server opens an ecosystem.
4. **Polish-first UI**: targets wtyczki.ai's PL user base (per `feedback_polish_market`); all runtime strings + Workers AI system prompts in Polish, tool descriptions English (LLM routing language).
5. **Visual identity differentiator**: most MCP apps are charts. This one has a Maslow pyramid + 3F triangle + 5-quadrant empathy grid — visually distinctive in the gallery / on screenshots / on wtyczki.ai listing pages.
6. **Conversation continuity via `updateModelContext`**: the model can write copy referencing "Małgosia z dominacją Food w 3F" without re-querying — feels native to the chat, not bolted on.
7. **Cost discipline**: Workers AI calls are per-dimension and small; full persona build is one call (~600 tokens out); frame generation is ~200 tokens. Cheap enough to be free-tier viable.

---

## Next Steps

1. **Generate PRP:** `/create-mcp-prp-v2 PRPs/ideas/persona-empatia_idea.md`
2. **Execute:** `/execute-mcp-prp-v2 PRPs/persona-empatia.md`
