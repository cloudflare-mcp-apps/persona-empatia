---
generator: /describe-server
generated: 2026-05-25
source_commit: 660581c
depends_on: [snapshot.md]
---

# MCP Server Description Report: persona-empatia

Generated: 2026-05-25
Source: projects/persona-empatia/

---

## 1. SERVER IDENTITY

- **Server name**: `Persona & Mapa Empatii` (from `SERVER_CONFIG.NAME` in `src/shared/constants.ts`)
- **Version**: `1.0.0` (from `package.json`)
- **One-sentence purpose**: Builds and refines copywriter target-audience personas using the Tkaczyk framework (Maslow + 3F triangle + 6-motivation profile + sensory empathy map), powered by Workers AI, with per-user D1 persistence for cross-conversation recall.
- **Live URL / domain**: `https://persona-empatia.wtyczki.ai` (custom domain, `workers_dev: false`)
- **MCP endpoint**: `https://persona-empatia.wtyczki.ai/mcp`
- **Authentication method**: OAuth 2.1 (WorkOS / AuthKit) — JWT-only; no API key path on this server
- **Language**: **Bilingual** — tool/resource descriptions, code comments, dev artifacts are English (LLM-facing); widget UI strings, tool result `content[]` text, prompt titles/bodies, and server instruction examples are Polish (runtime user-facing)

---

## 2. TOOLS — DETAILED

5 tools registered total: 2 model-visible, 3 app-only (widget-only).

---

### Tool: `build_persona`

- **Title**: `Stwórz personę copywriterską`
- **Visibility**: Model-visible
- **Description (verbatim)**:
  > Generate a copywriter's persona draft from a 1–2 sentence business description, using the Tkaczyk framework: assigned name + age + profession + location, Maslow level the product targets, 3F triangle weights, 6-motivation profile, and an initial sensory empathy map. Returns the full persona JSON plus a persistent persona_id, then renders the interactive widget for refinement. Use when the user says 'stwórz personę', 'kim jest mój klient', 'do kogo mam pisać', or pastes a product/business description and asks for a target audience. Note: persona language is Polish (framework fidelity); business description must be 5–500 chars.

- **Input parameters**:

  | Parameter | Type | Required | Default | Constraints | Description |
  |-----------|------|----------|---------|-------------|-------------|
  | `business` | string | yes | — | min: 5, max: 500 chars | What the user sells, in 1–2 sentences. |
  | `hints` | string | no | — | max: 200 chars | Optional known audience traits or context. |
  | `persona_name_hint` | string | no | — | max: 40 chars | Optional first name to assign to the persona. |

- **Output structure** (`PersonaPayload`):

  | Field | Type | Notes |
  |-------|------|-------|
  | `persona_id` | string (UUID) | Persistent, used by all other tools |
  | `name`, `age`, `gender`, `location`, `profession`, `business`, `hints` | string / number | Demographics |
  | `maslow_level` | integer 1–5 | Maslow pyramid level |
  | `triangle_3f` | `{ fuck, food, friends }` | Weights summing to 100 |
  | `motivations` | `{ pain, pleasure, fear, hope, belonging, rejection }` | Each 0–100, independent |
  | `empathy_map` | `{ sees, hears, feels, says, does }` | String fields, sensory profile |
  | `deep_need` | string \| null | Core psychological driver |
  | `pains`, `dreams` | string[] | Up to 5 items each |
  | `created_at`, `updated_at` | ISO 8601 string | Timestamps |

  - `content[0].text`: Polish summary sentence (e.g., `"Stworzono personę: Małgosia, 34 lat, …"`)
  - `structuredContent`: full `PersonaPayload`
  - `_meta`: `{ viewUUID: <uuid> }` for widget state

- **Annotations**: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: false`
- **Widget linked**: yes — `ui://persona-empatia/widget`
- **Example invocation**: "Stwórz personę dla sklepu z ekologiczną kawą specialty"

---

### Tool: `refine_persona`

- **Title**: `Dopracuj personę`
- **Visibility**: App-only (`visibility: ["app"]`) — triggered by widget sliders and field edits
- **Description (verbatim)**:
  > Apply a partial update (delta) to a saved persona — used by the widget when the user moves sliders, edits fields, or asks for regeneration of one dimension. Returns the full updated persona with updated_at bumped, so the widget can re-render consistently. Use when the widget triggers refinement (callServerTool from sliders/inputs) or the user in chat says 'zmień Małgosi wiek na 35', 'przesuń ją wyżej w piramidzie Maslowa'. Note: 3F weights are renormalized to sum 100 server-side; regenerate runs AFTER delta is applied; unknown persona_id returns a graceful 'not found' (not an error) — call load_persona to recover.

- **Input parameters**:

  | Parameter | Type | Required | Default | Constraints | Description |
  |-----------|------|----------|---------|-------------|-------------|
  | `persona_id` | string | yes | — | min: 20, max: 40 chars | ID of persona to update. |
  | `delta` | object | yes | — | any partial subset | Fields to overwrite; may be `{}` for regeneration-only. |
  | `delta.name` | string | no | — | max: 40 chars | — |
  | `delta.age` | integer | no | — | 13–99 | — |
  | `delta.gender` | enum | no | — | `female\|male\|nonbinary\|other` | — |
  | `delta.location` | string | no | — | max: 80 chars | — |
  | `delta.profession` | string | no | — | max: 80 chars | — |
  | `delta.maslow_level` | integer | no | — | 1–5 | — |
  | `delta.triangle_3f` | object | no | — | each axis 0–100; server renormalizes sum to 100 | — |
  | `delta.motivations` | object | no | — | each 0–100, independent | — |
  | `delta.empathy_map` | object (partial) | no | — | each field max 280 chars | — |
  | `delta.deep_need` | string \| null | no | — | max 280 chars | — |
  | `delta.pains` | string[] | no | — | max 5 items, each max 140 chars | — |
  | `delta.dreams` | string[] | no | — | max 5 items, each max 140 chars | — |
  | `regenerate` | enum | no | — | `empathy_map\|pains\|dreams\|deep_need` | Re-run Workers AI for one dimension after delta. |

- **Output structure**: Full `PersonaPayload` on success; `{ mode: "not_found", persona_id }` on unknown ID (not `isError`)
- **Annotations**: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: false`
- **Widget linked**: yes — `ui://persona-empatia/widget`
- **Example invocation**: Widget slider moved for `triangle_3f.food` → `callServerTool("refine_persona", { persona_id, delta: { triangle_3f: { fuck: 30, food: 50, friends: 20 } } })`

---

### Tool: `generate_frame`

- **Title**: `Wygeneruj ramkę copywriterską`
- **Visibility**: App-only (`visibility: ["app"]`)
- **Description (verbatim)**:
  > Generate a single copywriting 'ramka' for a saved persona — aspirational (future success scene), pain (current pain scene), or social (belonging scene) — using Workers AI with the persona's empathy map + 3F weights + Maslow level as grounding context. Returns one frame as 2–4 sentences of sensory Polish copy plus the framework reasoning so the user understands why this frame fits this persona. Use when the user asks for 'ramka aspiracyjna', 'ramka bólu', 'napisz scenkę', or clicks the '+ nowa ramka' button in the widget. Note: each call appends one frame to the persona's frame list; product_hook is optional; unknown persona_id returns a graceful 'not found' (not an error) — call load_persona to recover.

- **Input parameters**:

  | Parameter | Type | Required | Default | Constraints | Description |
  |-----------|------|----------|---------|-------------|-------------|
  | `persona_id` | string | yes | — | min: 20, max: 40 chars | Persona to ground the frame on. |
  | `frame_type` | enum | yes | — | `aspirational\|pain\|social` | Which Tkaczyk frame type to generate. |
  | `product_hook` | string | no | — | max: 200 chars | Optional product/feature to weave into the frame. |

- **Output structure** (`FramePayload`):

  | Field | Type | Notes |
  |-------|------|-------|
  | `frame_id` | string (UUID) | Persisted to D1 |
  | `persona_id` | string | FK reference |
  | `frame_type` | `aspirational\|pain\|social` | — |
  | `text` | string | 2–4 sentences of sensory Polish copy |
  | `framework_note` | string | AI reasoning for why this frame fits |
  | `product_hook` | string \| null | — |
  | `generated_at` | ISO 8601 string | — |

- **Annotations**: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: false`
- **Widget linked**: yes — `ui://persona-empatia/widget`
- **Example invocation**: User clicks "+ nowa ramka" → widget calls `callServerTool("generate_frame", { persona_id, frame_type: "aspirational" })`

---

### Tool: `load_persona`

- **Title**: `Wczytaj zapisaną personę`
- **Visibility**: Model-visible
- **Description (verbatim)**:
  > Recall a previously built persona by ID, or list the user's recent personas (default 5 most recent) so the model can resume work in a new conversation without rebuilding from scratch. Returns the same persona shape as build_persona (single mode) or a list of recent personas with summary fields (list mode). Use when the user references 'Małgosia z poprzedniej rozmowy', 'wczorajsza persona', 'moje persony', or the model needs persona context to fulfil a follow-up copywriting task. Note: list mode caps at 20 results; unknown persona_id returns a graceful 'not found' (not an error).

- **Input parameters**:

  | Parameter | Type | Required | Default | Constraints | Description |
  |-----------|------|----------|---------|-------------|-------------|
  | `persona_id` | string | no | — | min: 20, max: 40 chars | Specific persona to load. Omit for list mode. |
  | `limit` | integer | no | 5 | 1–20 | List-mode result cap. Applied only when `persona_id` is omitted. |

- **Output structure** (`LoadPersonaPayload`):
  - Single mode: `PersonaPayload & { mode: "single" }`
  - List mode: `{ mode: "list"; personas: PersonaListItem[] }` — each item has `persona_id`, `name`, `business`, `updated_at`
  - Not-found: `{ mode: "not_found", persona_id }`

- **Annotations**: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`
- **Widget linked**: yes — `ui://persona-empatia/widget`
- **Example invocation**: "Pokaż mi moje persony" / "Wczytaj personę Małgosi z poprzedniej rozmowy"

---

### Tool: `export_persona`

- **Title**: `Wyeksportuj personę`
- **Visibility**: App-only (`visibility: ["app"]`)
- **Description (verbatim)**:
  > Serialize a persona to Markdown (workshop-friendly, headings + sections) or JSON (machine-friendly, for feeding into other tools or storage) and return it inline so the widget can trigger app.downloadFile() or the user can copy/paste. Returns the rendered content string, the filename (slugified persona name + date), and the byte count. Use when the user asks to 'wyeksportuj personę', 'daj mi tę personę w markdown', or clicks the export button in the widget. Note: does NOT write a file server-side — the widget is responsible for download/clipboard; unknown persona_id returns a graceful 'not found' (not an error) — call load_persona to recover.

- **Input parameters**:

  | Parameter | Type | Required | Default | Constraints | Description |
  |-----------|------|----------|---------|-------------|-------------|
  | `persona_id` | string | yes | — | min: 20, max: 40 chars | Persona to export. |
  | `format` | enum | yes | — | `markdown\|json` | Output format. |

- **Output structure** (`ExportPersonaPayload`):

  | Field | Type | Description |
  |-------|------|-------------|
  | `content` | string | Rendered Markdown or JSON |
  | `filename` | string | `persona-<slugified-name>-<date>.<md\|json>` (Polish chars stripped via NFD) |
  | `byte_count` | number | UTF-8 byte count of content |

- **Annotations**: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`
- **Widget linked**: yes — `ui://persona-empatia/widget`
- **Example invocation**: User clicks export button → widget calls `callServerTool("export_persona", { persona_id, format: "markdown" })` → widget calls `app.downloadFile()`

---

## 3. PROMPTS / SLASH COMMANDS

2 prompts registered via `server.registerPrompt()` (kebab-case naming).

### Prompt: `nowa-persona`

- **Description**: Guided onboarding script — prompts the user for their product description and leads them through the persona creation flow, then calls `build_persona`.
- **Parameters**: None (no `argsSchema`)
- **Example**: User types `/nowa-persona` in Claude → Claude follows the guided onboarding conversation and calls `build_persona` with the collected input.

---

### Prompt: `przepisz-z-persona`

- **Description**: Copy rewrite workflow — loads an existing persona via `load_persona`, then rewrites the user-provided copy text using the persona's empathy map and motivation profile. Zero additional Workers AI cost (rewrite is LLM-side).
- **Parameters**:

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | `persona_id` | string | ID of the persona to use as context. |
  | `copy` | string | The copy text to rewrite. |

- **Example**: User provides a persona ID and ad copy → `load_persona` retrieves the persona → LLM rewrites the copy in the persona's voice.

---

## 4. INTERACTIVE WIDGET

- **Widget type**: Multi-tab persona dashboard with sliders and editable fields
- **UI resource URI**: `ui://persona-empatia/widget`
- **What it displays**:
  - Persona demographics (name, age, gender, location, profession)
  - Maslow pyramid level indicator
  - 3F triangle sliders (`fuck` / `food` / `friends`, renormalized to 100)
  - 6-motivation radar/sliders (pain, pleasure, fear, hope, belonging, rejection)
  - Sensory empathy map (sees, hears, feels, says, does)
  - Deep need field
  - Pains and dreams lists
  - Generated copywriting frames (aspirational, pain, social) with framework notes
  - Export buttons (Markdown / JSON)
- **User interactions**:
  - Move 3F and motivation sliders → calls `refine_persona` via `callServerTool`
  - Edit text fields (name, age, empathy map entries) → calls `refine_persona`
  - Click "+ nowa ramka [type]" → calls `generate_frame`
  - Click export → calls `export_persona`, then `app.downloadFile()`
  - Click "regenerate dimension" → calls `refine_persona` with `regenerate` param
- **Data flow**: Tool result `structuredContent` → `postMessage` to widget iframe → React state update → re-render
- **Real-time updates**: Yes — widget calls `app.callServerTool()` for `refine_persona`, `generate_frame`, `export_persona`
- **Dark mode**: Supported — `<meta name="color-scheme" content="light dark" />` in `widget.html`; Tailwind dark mode classes used
- **Widget dimensions**: Fixed `h-[500px]` container; `autoResize: false`; `sendSizeChanged({ height: 500 })` called after connect
- **Render style**: `prefersBorder: false` — blended (no card boundary)

---

## 5. HOW IT WORKS

- **Data flow**: User prompt → AI calls `build_persona` → Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) generates persona JSON → persisted to D1 → `PersonaPayload` returned + widget rendered → user refines via sliders → widget calls `refine_persona` → D1 updated → widget re-renders
- **External APIs used**: None — all AI inference is via Workers AI binding (internal Cloudflare), not external HTTP APIs
- **Business logic / formulas**:
  - **Tkaczyk framework**: Maslow level (1–5), 3F triangle (fuck/food/friends summing to 100), 6 motivations (pain/pleasure/fear/hope/belonging/rejection, each 0–100 independent), sensory empathy map (sees/hears/feels/says/does)
  - **3F renormalization**: On any `delta.triangle_3f`, server normalizes axes to exactly sum 100 (`server-side invariant`)
  - **Anti-injection**: User-controlled strings wrapped in `<user_input>` tags in AI system prompts (`src/ai/persona-generator.ts`)
  - **Retry logic**: 1 retry on JSON parse failure with stricter reminder prompt; second failure → `AiGenerationError` → SDK returns `isError: true` with Polish message
- **Caching**:
  - JWKS: module-level variable, cached per isolate lifetime
  - Persona data: D1 only — no in-memory or KV caching; each tool does a fresh D1 read
  - AI calls: `cacheTtl: 0` (AI Gateway) — no caching (unique persona inputs)
- **Practical use case scenarios**:
  1. **New campaign**: Copywriter types "stwórz personę dla kursu online z programowania dla kobiet" → `build_persona` generates Tkaczyk-framework persona → widget opens for refinement → copywriter adjusts Maslow level and motivations → generates 3 frame types for ad copy
  2. **Cross-conversation recall**: In a new Claude session, copywriter asks "wróćmy do Małgosi z zeszłego tygodnia" → `load_persona` (list mode, 5 most recent) → model identifies the right persona → continues refinement without rebuild
  3. **Workshop export**: After finalizing a persona, copywriter clicks Markdown export → downloads structured persona document for offline workshop handout or PDF generation

---

## 6. INSTALLATION INFO

- **Server URL**: `https://persona-empatia.wtyczki.ai`
- **Transports available**:
  - Streamable HTTP: `https://persona-empatia.wtyczki.ai/mcp`
- **Auth flow on first connect**: OAuth 2.1 redirect via WorkOS AuthKit (`panel.wtyczki.ai`). User must authenticate with a wtyczki.ai account. After login, JWT is issued and passed as `Authorization: Bearer <token>` on all `/mcp` requests. Token verified per-request via JWKS (`exciting-domain-65.authkit.app`).
- **Requirements**:
  - wtyczki.ai account required (OAuth login)
  - No external API keys needed by the user
  - Workers AI inference is included — no separate AI service account

---

## 7. LIMITATIONS & CONSTRAINTS

- **Input value ranges**:
  - `business`: 5–500 chars (hard reject below 5)
  - `hints`: max 200 chars
  - `persona_name_hint`: max 40 chars
  - `persona_id`: 20–40 chars on all referencing tools
  - `delta.age`: 13–99
  - `delta.maslow_level`: 1–5
  - `delta.triangle_3f` axes: 0–100 each (renormalized server-side to sum 100)
  - `delta.motivations` values: 0–100 each
  - `delta.empathy_map` fields: max 280 chars each
  - `delta.deep_need`: max 280 chars
  - `delta.pains` / `delta.dreams`: max 5 items, each max 140 chars
  - `load_persona` list limit: 1–20 (default 5)
  - `product_hook`: max 200 chars
- **API rate limits**: None implemented — no rate limiting on this server
- **Data freshness / caching**: Persona data is persistent in D1; no TTL or expiry. Updated on every `refine_persona` call (`updated_at` bumped). AI calls not cached (`cacheTtl: 0`).
- **Geographic restrictions**: None — Workers AI is global. Persona content is Polish-language by framework design (not a geographic restriction, but output language is fixed to Polish).
- **What it CANNOT do**:
  - Cannot generate personas in languages other than Polish (framework-fidelity constraint noted in tool description)
  - Cannot delete personas (no delete tool)
  - Cannot compare multiple personas side-by-side in a single tool call
  - Does not write export files server-side — widget must handle download/clipboard
  - No rate limiting protection against rapid widget slider calls
  - Widget state (`viewUUID`) is not persisted to `localStorage` — widget resets on iframe reload
  - No `outputSchema` on any tool — hosts cannot introspect output shapes via MCP schema

---

## 8. TECH STACK

- **Runtime**: Cloudflare Workers (Wrangler `^4.45.3`)
- **State management**: D1 (shared `mcp-oauth` database, tables `persona_personas` + `persona_frames`); stateless transport layer (`createMcpHandler` — fresh `McpServer` per request); no Durable Objects, no KV
- **Frontend**: React 19 + Tailwind CSS 3 + Radix UI component library (9 packages: avatar, progress, scroll-area, separator, slider, tabs, toggle, toggle-group, tooltip) + shadcn/ui + lucide-react icons; bundled via Vite + `vite-plugin-singlefile` into single inline HTML file
- **External services**: None — all inference via Workers AI binding (internal)
- **Workers AI model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- **AI Gateway**: `mcp-production-gateway` (observability routing, `cacheTtl: 0`)
- **MCP SDK version**: `@modelcontextprotocol/sdk ^1.29.0`
- **MCP Apps ext**: `@modelcontextprotocol/ext-apps ^1.7.0`
- **Agents SDK**: `agents ^0.11.5` (Cloudflare)
- **Schema validation**: `zod ^4.1.13` (v4 subpath import `zod/v4`)
- **JWT verification**: `jose ^6.1.0` (JWKS-based, module-level cache)
- **Key dependencies**: `react ^19.2.0`, `react-dom ^19.2.0`, `tailwindcss ^3.4.17`, `@radix-ui/react-slider ^1.3.6`, `@radix-ui/react-tabs ^1.1.13`, `lucide-react ^1.16.0`, `class-variance-authority ^0.7.1`

---

## Changelog

- 2026-05-25: Initial generation from snapshot.md (source commit 660581c)
