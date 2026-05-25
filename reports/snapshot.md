---
generator: /snapshot-server
generated: 2026-05-25
source_commit: 660581c
depends_on: []
---

# Persona & Mapa Empatii MCP App - Infrastructure Snapshot

**Generated**: 2026-05-25
**Repository**: persona-empatia
**Status**: Production
**Architecture**: MCP Apps (SEP-1865) - Stateful AI Generation Server (Workers AI persona builder with D1 persistence, per-user state across sessions)

---

## 1. Project Identity Metrics

- **Name**: Persona & Mapa Empatii
- **Slug**: `persona-empatia`
- **Wrangler name**: `persona-empatia`
- **Server version**: `1.0.0`
- **Description**: Copywriter's persona builder using the Tkaczyk framework (Maslow + 3F + 6 motivations + sensory empathy map + "dlaczego dziś?"), with Workers AI generation and per-user D1 persistence
- **Primary domain**: `persona-empatia.wtyczki.ai` (custom domain, `workers_dev: false`)

### Visual Identity
- **Server icon**: N/A — no `_meta.ui.icon` declared in `src/resources/ui-resources.ts`
- **Display name**: "Persona & Mapa Empatii" (from `SERVER_CONFIG.NAME` in `src/shared/constants.ts`)
- **Widget UI resource name**: `persona_widget`

### MCP Apps (SEP-1865) Configuration
- **Assets binding**: `ASSETS` → `./web/dist/widgets`
- **Build system**: Vite (`vite-plugin-singlefile`) with `emptyOutDir: false`, root at `web/`
- **UI URI**: `ui://persona-empatia/widget`
- **Two-part registration**: ✅ Resource (`persona_widget`) + Tool (`build_persona`) linked via `_meta.ui.resourceUri`; all 5 tools link to same resource URI

---

## 2. Required Functionalities Status

### 2.1 Dual Authentication (WorkOS + API Keys) — ⚠️ JWT-only (API key path not present)

- **JWT path**: ✅ Implemented — `Bearer` token verified via AuthKit JWKS (`src/auth/jwt-verify.ts`), user looked up in D1 by `workos_user_id` (`src/auth/auth-utils.ts`)
- **API key path**: ❌ Not present — JWT-only resource server (consistent with repo post-2026-05-18 pattern)
- **Shared infra**:
  - D1 binding: `DB` → database `mcp-oauth` (ID: `eac93639-d58e-4777-82e9-f1e28113d5b2`)
  - OAUTH_KV: ❌ Not bound (no KV namespace in `wrangler.jsonc`)
  - USER_SESSIONS: ❌ Not bound — thin resource server validates JWT per-request
- **Note**: `Env` in `src/types.ts` declares `ASSETS`, `DB`, `AUTHKIT_DOMAIN`, `AI`, and optional `AI_GATEWAY_ID`. No `OAUTH_KV` or `USER_SESSIONS` bindings.

### 2.2 Transport Protocol (createMcpHandler) — ✅

- **Pattern**: `createMcpHandler` from `agents/mcp` (Cloudflare canonical)
- **Endpoint**: `/mcp` (POST only, per `src/index.ts:41`)
- **DO class**: ❌ Not used — no Durable Objects declared in `wrangler.jsonc`
- **WebSocket hibernation**: N/A — `createMcpHandler` uses Streamable HTTP (WorkerTransport), not WebSocket
- **agents SDK version**: `^0.11.5` (from `package.json`)

### 2.3 Tool Implementation (SDK 1.25+) — ✅

- **Method**: `server.registerTool()` (native MCP SDK)
- **inputSchema**: Plain object (ZodRawShapeCompat) — ✅ correct, no `.shape` used
- **outputSchema**: ❌ Not declared — tools return dual content+structuredContent but no explicit `outputSchema` field in registrations
- **structuredContent**: ✅ All tools return `content` + `structuredContent` via `formatToolResult()`
- **isError**: ⚠️ Not used explicitly — errors thrown by tool handlers (AiGenerationError) are caught by the SDK which returns `isError: true` automatically; no manual `isError: true` in tool results
- **Zod import**: `import * as z from "zod/v4"` — ✅ correct
- **Naming convention**: `build_persona`, `refine_persona`, `generate_frame`, `load_persona`, `export_persona` — ⚠️ snake_case (not kebab-case); consistent across all 5 tools

### 2.4 Tool Descriptions (4-Part Pattern) — ✅

- **Pattern location**: `src/tools/descriptions.ts` — explicit `part1_purpose`, `part2_returns`, `part3_useCase`, `part4_constraints` fields
- **Assembly**: `getToolDescription()` concatenates all four parts at registration time
- **Language**: English (LLM-facing) — ✅ correct per repo language rule
- **Vendor hiding**: ✅ Descriptions say "Workers AI" generically; model/gateway names not exposed in descriptions (constants are internal-only)

### 2.5 Centralized Login (panel.wtyczki.ai) — ✅ (JWT path only)

- **USER_SESSIONS**: ❌ Not bound — thin resource server validates JWT on each request
- **Session cookie**: N/A — no session persistence on this server
- **is_deleted check**: ✅ SQL query filters `AND is_deleted = 0` (`src/auth/auth-utils.ts:16`)
- **Redirect flow**: N/A — handled by AuthKit / panel.wtyczki.ai

### 2.6 Prompts (SDK 1.20+) — ✅

- **Capability declaration**: `capabilities: { tools: {}, prompts: {}, resources: {} }` — `prompts` declared (`src/server.ts:56`)
- **Count**: 2 prompts
- **Method**: `server.registerPrompt()` (native SDK)
- **Naming convention**: `nowa-persona`, `przepisz-z-persona` — ✅ kebab-case
- **Full prompt list**:
  1. `nowa-persona` — guided onboarding, no argsSchema
  2. `przepisz-z-persona` — copy rewrite with argsSchema (`persona_id`, `copy`)

---

## 3. Optional Functionalities Status

### 3.1 Stateful Session — ✅ Per-user D1 persistence
Personas and frames are stored in D1 (`persona_personas`, `persona_frames` tables) keyed by `(user_id, persona_id)`. Recallable across conversations via `load_persona`.

### 3.2 Completions — ❌ Not implemented

### 3.3 Workers AI — ✅ Implemented
- **Binding**: `AI` (declared in `wrangler.jsonc:67-69` and `src/types.ts:49`)
- **Model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (from `src/shared/constants.ts:AI_GATEWAY.MODEL`)
- **Gateway**: `mcp-production-gateway` (AI Gateway routing for observability; `cacheTtl: 0` — unique inputs)
- **Token budgets**: `BUILD_PERSONA: 800`, `REGENERATE_DIMENSION: 400`, `GENERATE_FRAME: 350`
- **Tools using AI**: `build_persona`, `refine_persona` (when `regenerate` param), `generate_frame`
- **Retry**: 1 retry on JSON parse failure with stricter reminder prompt; second failure throws `AiGenerationError`

### 3.4 Workflows & Async — ❌ Not implemented (AI calls complete synchronously within tool handler)

### 3.5 Rate Limiting — ❌ Not implemented

### 3.6 KV Caching — ❌ Not bound (no KV namespace in `wrangler.jsonc`)

### 3.7 R2 Storage — ❌ Not bound (commented out in `wrangler.jsonc`)

### 3.8 ResourceLinks — ❌ Not implemented

### 3.9 Elicitation — ❌ Not implemented (`src/optional/elicitation/` is a placeholder directory)

### 3.10 Dynamic Tools — ❌ Not implemented (static tool list)

### 3.11 Tasks Protocol (Experimental) — ❌ Not adopted (per repo policy, `OVERRIDES-spec.md`)

### 3.12 Resources (MCP Apps — SEP-1865) — ✅

One UI resource registered:

```typescript
// src/server.ts:66-88
server.registerResource(
  "persona_widget",
  widgetResource.uri,           // "ui://persona-empatia/widget"
  {
    mimeType: RESOURCE_MIME_TYPE,   // "text/html;profile=mcp-app"
    description: widgetResource.description,
  },
  async () => {
    const templateHTML = await loadHtml(env.ASSETS, "/widget.html");
    return {
      contents: [{
        uri: widgetResource.uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: templateHTML,
        // CRITICAL: _meta.ui.csp / domain / preferences live on contents[] entry
        _meta: widgetResource._meta as Record<string, unknown>,
      }],
    };
  }
);
```

**_meta CSP configuration** (from `src/resources/ui-resources.ts`):
- `connectDomains: []` — no external fetch from widget (all data flows via MCP protocol)
- `resourceDomains: ["https://assets.claude.ai", "https://persistent.oaistatic.com", "https://*.oaistatic.com"]` — both Claude and ChatGPT CDN fonts
- `frameDomains`: not declared
- `baseUriDomains: []` — no `<base href>` usage
- `domain: "f272b45a4cf1cd8b8f7af824b24519cf.claudemcpcontent.com"` — stable Claude sandbox origin
- `prefersBorder: false` — blended widget (no card boundary)

### 3.13 Sampling — ❌ Not implemented (deprecated per SEP-2577, per repo policy)

---

## 4. Detailed Tool Audit (Tool Inventory)

### Tool 1: `build_persona`

**Technical name**: `build_persona`
**Display title**: `Stwórz personę copywriterską`
**Visibility**: Model-visible

**Description (Verbatim)**:
> Generate a copywriter's persona draft from a 1–2 sentence business description, using the Tkaczyk framework: assigned name + age + profession + location, Maslow level the product targets, 3F triangle weights, 6-motivation profile, and an initial sensory empathy map. Returns the full persona JSON plus a persistent persona_id, then renders the interactive widget for refinement. Use when the user says 'stwórz personę', 'kim jest mój klient', 'do kogo mam pisać', or pastes a product/business description and asks for a target audience. Note: persona language is Polish (framework fidelity); business description must be 5–500 chars.

**Input Schema** (from `src/schemas/inputs.ts`):

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `business` | string | Yes | min: 5, max: 500 | What the user sells, in 1–2 sentences. |
| `hints` | string | No | max: 200 | Optional known audience traits or context. |
| `persona_name_hint` | string | No | max: 40 | Optional first name to assign to the persona. |

**Output Schema**: ❌ Not declared (no `outputSchema` field in registration)

**Output payload** (from `src/schemas/outputs.ts`, `PersonaPayload`):

| Field | Type |
|-------|------|
| `persona_id` | string (UUID) |
| `name`, `age`, `gender`, `location`, `profession`, `business`, `hints` | string / number |
| `maslow_level` | 1–5 |
| `triangle_3f` | `{ fuck, food, friends }` — sum 100 |
| `motivations` | `{ pain, pleasure, fear, hope, belonging, rejection }` — each 0–100 |
| `empathy_map` | `{ sees, hears, feels, says, does }` — string fields |
| `deep_need` | string \| null |
| `pains`, `dreams` | string[] |
| `created_at`, `updated_at` | ISO string |

**Dual Auth Parity**:
- JWT path: `src/index.ts:89-91` — `createMcpHandler(server, { authContext: { props: { userId, email } } })`
- API key path: ❌ Not present (JWT-only server)
- Auth context in handler: `src/server.ts:112-113` — `getMcpAuthContext()` extracts `userId`

**Implementation Details**:
- Calls `generatePersonaDraft(env, business, hints, nameHint)` from `src/ai/persona-generator.ts`
- Workers AI: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via gateway `mcp-production-gateway`
- Anti-injection: user-provided strings wrapped in `<user_input>` tags before AI call
- Token budget: 800 max_tokens
- 1 retry on JSON parse failure
- Persists to D1: `insertPersona(env.DB, userId, persona)` (`src/db/queries.ts`)
- Returns `viewUUID: crypto.randomUUID()` in `_meta` for widget state persistence

**Output Format**: Polish summary text + `PersonaPayload` struct
- `content[0].text`: Polish sentence (e.g., "Stworzono personę: Małgosia, 34 lat, …")
- `structuredContent`: `PersonaPayload` object
- `_meta`: `{ viewUUID: <uuid> }`

**Tool Behavior Hints**:
- `readOnlyHint: false` — writes to D1
- `destructiveHint: false`
- `idempotentHint: false` — each call generates a new UUID persona
- `openWorldHint: false` — internal AI gateway (not open web)

**MCP Prompt Integration**: `nowa-persona` prompt guides user to call `build_persona`

---

### Tool 2: `refine_persona`

**Technical name**: `refine_persona`
**Display title**: `Dopracuj personę`
**Visibility**: App-only (`visibility: ["app"]`)

**Description (Verbatim)**:
> Apply a partial update (delta) to a saved persona — used by the widget when the user moves sliders, edits fields, or asks for regeneration of one dimension. Returns the full updated persona with updated_at bumped, so the widget can re-render consistently. Use when the widget triggers refinement (callServerTool from sliders/inputs) or the user in chat says 'zmień Małgosi wiek na 35', 'przesuń ją wyżej w piramidzie Maslowa'. Note: 3F weights are renormalized to sum 100 server-side; regenerate runs AFTER delta is applied; unknown persona_id returns a graceful 'not found' (not an error) — call load_persona to recover.

**Input Schema** (from `src/schemas/inputs.ts`):

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `persona_id` | string | Yes | min: 20, max: 40 | ID of the persona to update. |
| `delta` | object (PersonaDelta) | Yes | any partial subset | Fields to overwrite; may be `{}` for regeneration-only. |
| `delta.name` | string | No | max: 40 | — |
| `delta.age` | number (int) | No | 13–99 | — |
| `delta.gender` | enum | No | female\|male\|nonbinary\|other | — |
| `delta.location` | string | No | max: 80 | — |
| `delta.profession` | string | No | max: 80 | — |
| `delta.maslow_level` | number (int) | No | 1–5 | — |
| `delta.triangle_3f` | object | No | each axis 0–100 | Server renormalizes to sum 100. |
| `delta.motivations` | object | No | each 0–100, independent | — |
| `delta.empathy_map` | object (partial) | No | each field max 280 | — |
| `delta.deep_need` | string \| null | No | max 280 | — |
| `delta.pains` | string[] | No | max 5 items, each max 140 | — |
| `delta.dreams` | string[] | No | max 5 items, each max 140 | — |
| `regenerate` | enum | No | empathy_map\|pains\|dreams\|deep_need | Re-run AI for one dimension after delta. |

**Output Schema**: ❌ Not declared

**Output payload**: Full `PersonaPayload` on success; `{ mode: "not_found", persona_id }` on unknown ID

**Dual Auth Parity**:
- JWT path: Same `createMcpHandler` path as `build_persona`
- API key path: ❌ Not present

**Implementation Details**:
- `getPersona(env.DB, userId, persona_id)` — reads current row
- Applies delta fields (non-null overwrite)
- If `triangle_3f` in delta: renormalizes to sum 100 server-side
- If `regenerate`: calls Workers AI for single dimension after delta is applied
- `updatePersona(env.DB, userId, persona)` — full-overwrite UPDATE (no partial SET)
- Graceful miss: returns `mode: "not_found"` payload with Polish recovery hint (not `isError`)

**Tool Behavior Hints**:
- `readOnlyHint: false`
- `destructiveHint: false`
- `idempotentHint: false` — AI regen is non-deterministic
- `openWorldHint: false`

---

### Tool 3: `generate_frame`

**Technical name**: `generate_frame`
**Display title**: `Wygeneruj ramkę copywriterską`
**Visibility**: App-only (`visibility: ["app"]`)

**Description (Verbatim)**:
> Generate a single copywriting 'ramka' for a saved persona — aspirational (future success scene), pain (current pain scene), or social (belonging scene) — using Workers AI with the persona's empathy map + 3F weights + Maslow level as grounding context. Returns one frame as 2–4 sentences of sensory Polish copy plus the framework reasoning so the user understands why this frame fits this persona. Use when the user asks for 'ramka aspiracyjna', 'ramka bólu', 'napisz scenkę', or clicks the '+ nowa ramka' button in the widget. Note: each call appends one frame to the persona's frame list; product_hook is optional; unknown persona_id returns a graceful 'not found' (not an error) — call load_persona to recover.

**Input Schema** (from `src/schemas/inputs.ts`):

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `persona_id` | string | Yes | min: 20, max: 40 | ID of the persona to ground the frame on. |
| `frame_type` | enum | Yes | aspirational\|pain\|social | Which framework frame to generate. |
| `product_hook` | string | No | max: 200 | Optional product/feature to weave into the frame. |

**Output Schema**: ❌ Not declared

**Output payload** (`FramePayload`):

| Field | Type |
|-------|------|
| `frame_id` | string (UUID) |
| `persona_id` | string |
| `frame_type` | aspirational\|pain\|social |
| `text` | string — sensory Polish copy (2–4 sentences) |
| `framework_note` | string — reasoning |
| `product_hook` | string \| null |
| `generated_at` | ISO string |

**Dual Auth Parity**: Same as `build_persona`

**Implementation Details**:
- Reads persona from D1 (`getPersona`) then calls `aiGenerateFrame()`
- Workers AI call with persona's empathy_map + 3F + Maslow as grounding
- Token budget: 350 max_tokens
- 1 retry on JSON parse failure
- Persists frame to D1: `insertFrame(env.DB, userId, frame)`
- Graceful miss for unknown persona_id (not `isError`)

**Tool Behavior Hints**:
- `readOnlyHint: false`
- `destructiveHint: false`
- `idempotentHint: false`
- `openWorldHint: false`

---

### Tool 4: `load_persona`

**Technical name**: `load_persona`
**Display title**: `Wczytaj zapisaną personę`
**Visibility**: Model-visible

**Description (Verbatim)**:
> Recall a previously built persona by ID, or list the user's recent personas (default 5 most recent) so the model can resume work in a new conversation without rebuilding from scratch. Returns the same persona shape as build_persona (single mode) or a list of recent personas with summary fields (list mode). Use when the user references 'Małgosia z poprzedniej rozmowy', 'wczorajsza persona', 'moje persony', or the model needs persona context to fulfil a follow-up copywriting task. Note: list mode caps at 20 results; unknown persona_id returns a graceful 'not found' (not an error).

**Input Schema** (from `src/schemas/inputs.ts`):

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `persona_id` | string | No | min: 20, max: 40 | Specific persona ID to load. Omit for list mode. |
| `limit` | number (int) | No | 1–20 | List-mode result cap (default 5). Applied only when `persona_id` is omitted. |

**Output Schema**: ❌ Not declared

**Output payload** (`LoadPersonaPayload`):
- Single mode: `PersonaPayload & { mode: "single" }`
- List mode: `{ mode: "list"; personas: PersonaListItem[] }` (fields: `persona_id`, `name`, `business`, `updated_at`)
- Not-found: `{ mode: "not_found", persona_id }`

**Dual Auth Parity**: Same as `build_persona`

**Tool Behavior Hints**:
- `readOnlyHint: true`
- `destructiveHint: false`
- `idempotentHint: true`
- `openWorldHint: false`

---

### Tool 5: `export_persona`

**Technical name**: `export_persona`
**Display title**: `Wyeksportuj personę`
**Visibility**: App-only (`visibility: ["app"]`)

**Description (Verbatim)**:
> Serialize a persona to Markdown (workshop-friendly, headings + sections) or JSON (machine-friendly, for feeding into other tools or storage) and return it inline so the widget can trigger app.downloadFile() or the user can copy/paste. Returns the rendered content string, the filename (slugified persona name + date), and the byte count. Use when the user asks to 'wyeksportuj personę', 'daj mi tę personę w markdown', or clicks the export button in the widget. Note: does NOT write a file server-side — the widget is responsible for download/clipboard; unknown persona_id returns a graceful 'not found' (not an error) — call load_persona to recover.

**Input Schema** (from `src/schemas/inputs.ts`):

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `persona_id` | string | Yes | min: 20, max: 40 | ID of the persona to export. |
| `format` | enum | Yes | markdown\|json | Output format. |

**Output Schema**: ❌ Not declared

**Output payload** (`ExportPersonaPayload`):

| Field | Type | Description |
|-------|------|-------------|
| `content` | string | Rendered Markdown or JSON content |
| `filename` | string | Slugified name + date + extension |
| `byte_count` | number | UTF-8 byte count |

**Dual Auth Parity**: Same as `build_persona`

**Implementation Details**:
- Reads persona + frames from D1 (`getPersona` + `getFrames`)
- Markdown export: full headings + Maslow/3F/motivations/empathy_map/pains/dreams/frames sections
- JSON export: `{ persona, frames }` via `JSON.stringify(..., null, 2)`
- Filename: `persona-${slugify(name)}-${dateStr}.{md|json}` (Polish chars stripped via NFD normalization)
- Does NOT write server-side — returns content inline for widget `app.downloadFile()` or copy-paste
- Graceful miss: `mode: "not_found"` payload (not `isError`)

**Tool Behavior Hints**:
- `readOnlyHint: true`
- `destructiveHint: false`
- `idempotentHint: true`
- `openWorldHint: false`

---

## 5. UX & Frontend Quality Assessment (6 Pillars)

### Pillar I: Identity & First Impression
- ✅ Server name "Persona & Mapa Empatii" — clear, framework-specific, market-appropriate
- ❌ No icon declared in `_meta.ui.icon` (no `icon` key in `UI_RESOURCES.widget._meta.ui`)
- ✅ `SERVER_INSTRUCTIONS` provides comprehensive orientation including example PL queries
- ✅ Tool titles in Polish: "Stwórz personę copywriterską", "Wczytaj zapisaną personę"
- ✅ `prefersBorder: false` — blended widget (recommended cross-platform)

### Pillar II: Model Control & Quality
- **`SERVER_INSTRUCTIONS` word count**: ~270 words (English structural + Polish examples), well within 300-word cap
- **Coverage**:
  - ✅ Key Capabilities section (4 bullets)
  - ✅ Usage Patterns — explicit tool invocation guidance (`build_persona`, `load_persona`, `refine_persona`, `generate_frame`)
  - ✅ Prompts section — documents `/nowa-persona` and `/przepisz-z-persona`
  - ✅ Performance & Limits — latency per tool type, list cap
  - ✅ Language directive — "Respond to the user in Polish unless they explicitly switch language"
  - ✅ Example queries in Polish (5 concrete examples)
  - ✅ Important Notes section — auth, widget-first approach, forward-compatibility mention

### Pillar III: Interactivity & Agency
- ✅ Full interactive persona widget — sliders for 3F/motivations, editable fields, empathy map, frame generation
- ✅ `autoResize: false` implemented (`web/widgets/widget.tsx:95`)
- ✅ `sendSizeChanged({ height: 500 })` called after connect (`web/widgets/widget.tsx:164`)
- ✅ App-only tools for widget callbacks: `refine_persona`, `generate_frame`, `export_persona`
- ✅ `callServerTool` used by widget for app-only tool calls (lines 188, 235, 253)
- ✅ `h-[500px]` fixed height container (not `h-screen` or `100vh`)
- ⚠️ `viewUUID` returned in `_meta` by `formatToolResult()` but widget does NOT persist to `localStorage` (no `view-state-${uuid}` key found in `widget.tsx`) — state lost on iframe reload

### Pillar IV: Context & Data Management
- ✅ Per-user D1 persistence (`persona_id`, `frame_id` keyed by `user_id`)
- ✅ Cross-conversation recall via `load_persona` (list mode default 5, configurable up to 20)
- ✅ `next_steps`-equivalent: `SERVER_INSTRUCTIONS` instructs model on multi-step flows
- ✅ Graceful "not found" returns (not `isError`) across `refine_persona`, `generate_frame`, `load_persona`, `export_persona`
- ⚠️ `viewUUID` set in result `_meta` but not consumed by widget for localStorage persistence

### Pillar V: Media & Content Handling
- ✅ viteSingleFile inlines all React/CSS/JS into single HTML bundle
- ✅ Tailwind CSS with Radix UI components (`@radix-ui/react-slider`, `@radix-ui/react-tabs`, etc.)
- ✅ shadcn/ui component library wired (`components.json` present, `/web/components/`)
- ✅ Export generates Markdown (workshop docs) or JSON (downstream tooling) inline for download/copy
- N/A — no external images or media beyond React/Tailwind (no `resourceDomains` for data needed)

### Pillar VI: Operations & Transparency
- ✅ Structured logging via `src/shared/logger.ts` — typed events: `tool_started`, `tool_completed`, `tool_failed`
- ✅ `observability: { enabled: true }` in `wrangler.jsonc`
- ✅ `logger.info` with `user_id`, `action_id` (UUID), `duration_ms` for auditability
- ✅ `tool_failed` events emitted in `build_persona` error path
- ✅ AI Gateway routing (`mcp-production-gateway`) provides AI call observability
- ⚠️ Auth failure not structured-logged: `src/auth/jwt-verify.ts:33` uses bare `catch { return null; }` — no `logger.warn({ event: 'auth_attempt', success: false })` for JWT failures
- ⚠️ `auth-utils.ts:18` uses `console.error` directly (not structured logger) for D1 auth query errors

---

## 6. Deployment Status

### 6.1 Consistency Tests
- **Script**: `../../scripts/verify-consistency.sh` — script does NOT exist in this repository
- **Result**: N/A — script not found

### 6.2 TypeScript Compilation

**Command**: `cd projects/persona-empatia && npx tsc --noEmit`
**Result**: ✅ Exit code 0 — no errors

### 6.3 Production URL

- **Primary domain**: `persona-empatia.wtyczki.ai` (custom domain, `wrangler.jsonc:101-105`)
- **workers_dev**: `false` ✅ (disabled)
- **Custom domain config**: `{ "pattern": "persona-empatia.wtyczki.ai", "custom_domain": true }`

---

## 7. Infrastructure Components

### Cloudflare Assets (MCP Apps)
- **Binding**: `ASSETS` (type: `Fetcher`)
- **Directory**: `./web/dist/widgets`
- **Build command**: `npm install && npm run build:widgets && npx tsc --noEmit`
- **Widget files built**: `widget.html` (single-file bundle via `vite-plugin-singlefile`)

### Durable Objects
- ❌ None — no Durable Objects declared or migrated in `wrangler.jsonc`

### KV Namespaces
- **OAUTH_KV**: ❌ Not bound
- **USER_SESSIONS**: ❌ Not bound
- **Note**: JWT per-request auth; no session state stored in KV

### D1 Database
- **Binding**: `DB`
- **Database name**: `mcp-oauth`
- **Database ID**: `eac93639-d58e-4777-82e9-f1e28113d5b2`
- **Tables**:
  - `users` (shared) — `user_id`, `email`, `is_deleted`, `workos_user_id` (auth lookup)
  - `persona_personas` (server-specific) — full persona data, namespaced with `persona_` prefix
  - `persona_frames` (server-specific) — generated copywriting frames, FK cascade to personas
- **Migration file**: `migrations/0001_persona_tables.sql`
- **Indexes**: `idx_persona_personas_user_updated` (`user_id, updated_at DESC`), `idx_persona_frames_persona` (`user_id, persona_id, generated_at DESC`)

### R2 Storage — ❌ Not bound (commented out in `wrangler.jsonc`)

### Workers AI — ✅
- **Binding**: `AI` (declared in `wrangler.jsonc:67-69`)
- **Model**: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
- **Gateway**: `mcp-production-gateway` (`cacheTtl: 0`)

### AI Gateway — ✅
- **Gateway ID**: `mcp-production-gateway`
- **Purpose**: Routes all Workers AI calls for observability and caching

### Workflows — ❌ Not configured

### Secrets (Wrangler)

**Vars (non-secret)**:
- `AUTHKIT_DOMAIN`: `exciting-domain-65.authkit.app`

**Optional env var** (not secret, not in `Env`):
- `AI_GATEWAY_ID?: string` — declared in `types.ts` as optional but not set in `wrangler.jsonc`

**Secrets required**: None server-specific — zero per-server secrets; JWT verification uses `AUTHKIT_DOMAIN` var (plaintext)

---

## 8. Architecture Patterns

### Authentication Architecture
- **Flow**: `POST /mcp` → Bearer token extraction (`src/index.ts:68-70`) → JWKS verification via `jose` (`src/auth/jwt-verify.ts`) → D1 lookup by `workos_user_id` (`src/auth/auth-utils.ts`) → `createMcpHandler(server, { authContext: { props: { userId, email } } })` → tools call `getMcpAuthContext()`
- **JWKS caching**: Module-level `let jwks` in `src/auth/jwt-verify.ts:10` — lazily initialized, cached per isolate lifetime
- **Thin resource server**: Zero per-server secrets; AuthKit is authorization server; this worker is resource server only

### Caching Strategy
- **JWKS**: Cached per isolate via module-level variable in `src/auth/jwt-verify.ts`
- **Persona data**: D1 persistence — no in-memory caching; each tool call does a D1 read
- **AI calls**: `cacheTtl: 0` — no AI Gateway caching (unique persona inputs)
- **No LRU, no KV caching** — pure request-stateless transport layer, stateful data via D1

### Concurrency Control
- D1 read-modify-write is NOT wrapped in a transaction (D1 doesn't yet support multi-statement transactions per `src/db/queries.ts` comment)
- Acceptable race condition: per-user edits — concurrent `refine_persona` calls could race; full-overwrite UPDATE is the mitigation (last write wins)
- `createMcpHandler` provides fresh `McpServer` per request — no shared transport state

### Storage Architecture
- **D1 (shared)**: Read-only `users` lookup + read/write `persona_personas` and `persona_frames`
- **JSON columns**: `triangle_3f`, `motivations`, `empathy_map`, `pains`, `dreams` stored as JSON strings, parsed in query layer
- **Assets**: Widget HTML served via `ASSETS` binding per resource read
- **No R2, no KV** — D1 is the sole persistence layer

---

## 9. Code Quality

### Type Safety
- **TypeScript strict**: ✅ `"strict": true` in `tsconfig.json`; tsc exits 0 with no errors
- **Zod v4**: ✅ `import * as z from "zod/v4"` throughout; `.meta({ description })` used (not `.describe()`)
- **Framework types**: `MaslowLevel`, `MotivationKey`, `TriangleAxis`, `FrameType`, `EmpathyKey`, `Gender` — all branded/literal types from `src/framework.ts`
- **Tool metadata**: `as const satisfies Record<string, ToolMetadata>` constraint on `TOOL_METADATA`
- **Type casting**: `params as BuildPersonaParams` in tool handlers (SDK limitation — SDK passes `unknown`)

### Error Handling

| Scenario | Handling |
|----------|----------|
| Missing Bearer token | `401 Unauthorized` with `WWW-Authenticate` header |
| JWT verification failure | `null` return → 401 (bare `catch {}` — silent) |
| User not found / is_deleted | `null` return → 401 (+ `console.error` in auth-utils) |
| AI JSON parse failure | 1 retry with stricter prompt; second failure → `AiGenerationError` |
| `AiGenerationError` thrown | SDK catches → `isError: true`, Polish user-facing message |
| Unknown `persona_id` | Graceful `mode: "not_found"` payload (not `isError`) on all tools |
| Assets fetch failure | `throw new Error(...)` → propagates to 500 handler |
| Server-level catch | `src/index.ts:48-53` — JSON 500 response with structured error log |

### Observability
- **Cloudflare Observability**: `enabled: true` in `wrangler.jsonc`
- **Structured logging**: `src/shared/logger.ts` — full typed union of all log event shapes, JSON output to `console.log`
- **Tool events**: `tool_started` (with args metadata), `tool_completed` (with duration_ms), `tool_failed` (with error string)
- **Transport events**: `transport_request` logged at `src/index.ts:74`
- **Server error events**: `server_error` in global catch (`src/index.ts:49`)
- **AI Gateway**: All Workers AI calls routed through `mcp-production-gateway` for usage dashboards
- **Missing**: Auth failure structured logging (bare `catch {}` in JWT verify); `auth-utils.ts` uses raw `console.error`

---

## 10. Technical Specifications

### Performance

| Metric | Value |
|--------|-------|
| `build_persona` latency | ~2–3s (one Workers AI call, 800 tokens) |
| `generate_frame` latency | ~2–3s (one Workers AI call, 350 tokens) |
| `refine_persona` (no regenerate) | <500ms (D1 read + write only) |
| `refine_persona` (with regenerate) | ~2–3s (Workers AI call for one dimension) |
| `load_persona` | <500ms (D1 read only) |
| `export_persona` | <500ms (D1 read + string render) |
| Widget load | Not benchmarked — large bundle (Radix UI + Tailwind) |
| Rate limiting | None |
| D1 user lookup | ~10–30ms typical |

### Dependencies

**Common Across MCP Apps**:
```json
{
  "@modelcontextprotocol/ext-apps": "^1.7.0",
  "@modelcontextprotocol/sdk": "^1.29.0",
  "agents": "^0.11.5",
  "zod": "^4.1.13",
  "jose": "^6.1.0"
}
```

**Widget-Specific (Radix UI + shadcn)**:
```json
{
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-progress": "^1.1.8",
  "@radix-ui/react-scroll-area": "^1.2.10",
  "@radix-ui/react-separator": "^1.1.8",
  "@radix-ui/react-slider": "^1.3.6",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-toggle": "^1.1.10",
  "@radix-ui/react-toggle-group": "^1.1.11",
  "@radix-ui/react-tooltip": "^1.2.8",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^1.16.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "tailwind-merge": "^3.4.0"
}
```

**Development**:
```json
{
  "@cloudflare/workers-types": "^4.20250101.0",
  "@types/react": "^19.2.2",
  "@types/react-dom": "^19.2.2",
  "@vitejs/plugin-react": "^4.3.4",
  "autoprefixer": "^10.4.20",
  "concurrently": "^9.2.1",
  "cross-env": "^7.0.3",
  "postcss": "^8.4.49",
  "tailwindcss": "^3.4.17",
  "typescript": "^5.9.3",
  "vite": "^6.0.6",
  "vite-plugin-singlefile": "^2.3.0",
  "wrangler": "^4.45.3"
}
```

### SDK Versions
- `@modelcontextprotocol/sdk`: `^1.29.0`
- `@modelcontextprotocol/ext-apps`: `^1.7.0`
- `agents` (Cloudflare Agents SDK): `^0.11.5`
- `zod`: `^4.1.13` (v4 subpath import)

---

## 11. Compliance Summary

| Check | Status | Notes |
|-------|--------|-------|
| Vendor Hiding | ✅ | No external vendor/model names in tool descriptions |
| Dual Auth Parity | ⚠️ | JWT only; API key path not present (by design, post-2026-05-18) |
| 4-Part Descriptions | ✅ | Explicit 4-part structure in `src/tools/descriptions.ts` |
| Custom Domain | ✅ | `persona-empatia.wtyczki.ai` |
| workers_dev Disabled | ✅ | `"workers_dev": false` |
| Consistency Tests | N/A | `verify-consistency.sh` does not exist in this repo |
| TypeScript Compilation | ✅ | Exit code 0 |
| Prompts Implemented | ✅ | 2 prompts: `nowa-persona`, `przepisz-z-persona` |
| Zod Schema Shape | ✅ | Plain object (ZodRawShapeCompat), no `.shape` |
| Tool Naming (kebab-case) | ⚠️ | snake_case used (`build_persona` etc.); consistent but diverges from convention |
| Error Handling | ✅ | `AiGenerationError` → SDK isError; graceful not-found; 401/500 for transport |
| Color-scheme Meta | ✅ | `<meta name="color-scheme" content="light dark" />` in `widget.html` |
| Cross-env Build | ✅ | `cross-env INPUT=...` in all build scripts |
| autoResize: false | ✅ | `{ autoResize: false }` in `widget.tsx:95` |
| sendSizeChanged | ✅ | Called after connect with `{ height: 500 }` (`widget.tsx:164`) |
| App-only tool visibility | ✅ | `refine_persona`, `generate_frame`, `export_persona` use `visibility: ["app"]` |
| Tool annotations | ✅ | `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` declared on all tools |
| outputSchema | ❌ | Not declared on any tool |
| structuredContent | ✅ | All tools return dual content + structuredContent via `formatToolResult()` |
| viewUUID in result | ✅ | `_meta: { viewUUID: crypto.randomUUID() }` on every tool result |
| viewUUID localStorage | ❌ | Widget does not consume `viewUUID` for localStorage persistence |
| Auth failure logging | ❌ | `jwt-verify.ts` uses bare `catch {}` — no structured auth_attempt event |

---

## 12. Unique Architectural Features

### 1. Tkaczyk Framework Typed Vocabulary
The server encodes the full Tkaczyk copywriting framework as TypeScript types and Polish-language constants in `src/framework.ts` — `MaslowLevel`, `TriangleAxis` (fuck/food/friends), `MotivationKey` (6 dimensions), `EmpathyKey` (sees/hears/feels/says/does), `FrameType`. These flow through: AI system prompts, D1 schema CHECK constraints, tool input/output schemas, and Markdown export labels. Framework fidelity is enforced at the type level.

### 2. AI Gateway Routing with Anti-Injection
All Workers AI calls use `<user_input>` tag wrapping on user-controlled strings before injection into system prompts (see `src/ai/persona-generator.ts`). The gateway ID is pinned in constants (`AI_GATEWAY.ID = "mcp-production-gateway"`), not passed through user input. This is a security-conscious AI integration pattern.

```typescript
// src/ai/persona-generator.ts
const result = await env.AI.run(
  AI_GATEWAY.MODEL,
  { messages: [...], max_tokens: tokenBudget },
  { gateway: { id: AI_GATEWAY.ID, cacheTtl: AI_GATEWAY.CACHE_TTL } },
);
```

### 3. Graceful Not-Found Pattern (Non-Error Returns)
All four tools that take a `persona_id` (`refine_persona`, `generate_frame`, `load_persona`, `export_persona`) return a `{ mode: "not_found", persona_id }` payload with a Polish recovery hint instead of `isError: true`. This allows the model to self-recover by calling `load_persona` without breaking the tool call chain.

### 4. D1 JSON-Column Strategy with Cascade FK
Persona dimensions (`triangle_3f`, `motivations`, `empathy_map`, `pains`, `dreams`) are stored as JSON strings rather than separate columns, keeping the schema simple while preserving full type fidelity at the application layer. `persona_frames` uses a cascade FK on `(user_id, persona_id)` so deleting a persona cleans all frames automatically.

### 5. Prompt + Tool Two-Level Interaction Model
The server combines prompts (onboarding scripts) and tools (stateful operations) in a coherent interaction pattern:
- `nowa-persona` prompt: guides the conversation, then calls `build_persona` tool
- `przepisz-z-persona` prompt: calls `load_persona` tool, then uses the persona data for LLM-side copy rewrite (zero additional Workers AI cost)

This is a clean example of prompts as orchestration scaffolds, tools as state operations.

### 6. 3F Renormalization Server-Side
When `refine_persona` receives a `delta.triangle_3f`, the server automatically renormalizes the three axes to sum to exactly 100. Widget sliders can be imprecise — the server guarantees the invariant.

---

## 13. Known Issues & Limitations

1. **No `outputSchema`**: None of the 5 tools declare an `outputSchema` in their registration. Hosts that rely on structured output schema for UI rendering or validation cannot introspect tool output shapes.
2. **snake_case tool naming**: Convention in this repo is kebab-case (`start-quiz`, `submit-quiz-results`); this server uses snake_case (`build_persona`, `refine_persona`). Consistent within the server but diverges from the platform standard.
3. **`viewUUID` not consumed by widget**: Server sets `_meta.viewUUID` on every tool result, but `web/widgets/widget.tsx` does not read this or write to `localStorage`. State is lost on iframe reload (theme toggle, fullscreen, host crash).
4. **Auth failure silent**: JWT verification failures (`src/auth/jwt-verify.ts:33`) use bare `catch { return null; }` — no structured `logger.warn({ event: 'auth_attempt' })`. Makes auth failure debugging harder in `wrangler tail`.
5. **D1 race condition**: `refine_persona` does read-modify-write without a D1 transaction. Concurrent widget operations on the same persona could silently overwrite each other (last-write-wins).
6. **README has unfilled placeholder**: `README.md` still has `# {{SERVER_NAME}} MCP Server` in the title — not replaced from skeleton. Non-functional but cosmetic.
7. **No `serve:stdio` script**: `package.json` has `dev:full` but no `serve:stdio` script for Claude Desktop local testing (build-configuration.md recommends dual transport scripts).
8. **Large widget bundle**: Heavy Radix UI dependency set (`@radix-ui/react-*`, 9 packages) plus `lucide-react` — no code splitting in single-file bundle. First load may be slow on mobile.

---

## 14. Future Roadmap

### Implemented (Latest)
- Full 5-tool persona lifecycle (build → refine → generate_frame → load → export)
- 2 MCP prompts (`nowa-persona`, `przepisz-z-persona`)
- Workers AI integration via gateway with anti-injection guards
- D1 persistence with persona + frame tables, cascade FK
- shadcn/ui Radix components for slider/tab-based persona editing
- `formatToolResult()` with `viewUUID` in `_meta`
- App-only tools for widget callbacks (`refine_persona`, `generate_frame`, `export_persona`)

### Planned Components (from `SERVER_INSTRUCTIONS`)
- **audyt-copy** server integration — `export_persona` JSON is described as "forward-compatible with the planned audyt-copy server"
- `viewUUID` localStorage state persistence (widget side)
- Structured auth failure logging

### Planned Use Cases
- Multi-persona comparison
- Frame history per persona (currently frame list grows unbounded; no deletion UX)
- Workshop export workflow (Markdown download to PDF)

---

## 15. Testing Status

- [ ] Unit tests — ❌ No test files found in `projects/persona-empatia/`
- [ ] Integration tests — ❌ None
- [ ] TypeScript compilation — ✅ Passes (`tsc --noEmit` exit 0)
- [ ] Widget build — ✅ `web/dist/widgets/widget.html` exists (pre-built)
- [ ] Workers AI persona generation — not verified in this snapshot run
- [ ] D1 persona persistence (build → load cycle) — not verified
- [ ] JWT auth rejection test — not verified
- [ ] Prompt `nowa-persona` → `build_persona` flow — not verified
- [ ] Prompt `przepisz-z-persona` → `load_persona` flow — not verified
- [ ] Export Markdown/JSON — not verified

---

## 16. Documentation Status

| Document | Status | Notes |
|----------|--------|-------|
| README | ⚠️ | Present but title has unfilled `{{SERVER_NAME}}` placeholder |
| API docs | ❌ | Not present |
| Setup guide | ❌ | Not present (README covers basics) |
| Troubleshooting | ⚠️ | "Common Issues" section in README |
| Deployment | ✅ | Covered by README + `wrangler.jsonc` + repo-level `ARCHITECTURE.md` |
| Migration SQL | ✅ | `migrations/0001_persona_tables.sql` — clear schema with CHECK constraints |
| PLAN.md | ✅ | `projects/persona-empatia/PLAN.md` present |

---

## 17. File Structure (MCP Apps Standard)

### Source Files (`src/`)
```
src/
├── index.ts                     # Auth router, fetch handler, handleAuthenticatedMcp
├── server.ts                    # createServer() factory — McpServer, registerResource, 5 registerTool, 2 registerPrompt
├── server-instructions.ts       # SERVER_INSTRUCTIONS constant (~270 words)
├── types.ts                     # Env interface (ASSETS, DB, AUTHKIT_DOMAIN, AI, AI_GATEWAY_ID?)
├── framework.ts                 # Tkaczyk framework types + PL labels (Maslow, 3F, motivations, empathy)
├── well-known.ts                # /.well-known/oauth-protected-resource + authorization-server
├── ai/
│   ├── persona-generator.ts     # generatePersonaDraft, regenerateDimension, generateFrame (Workers AI)
│   └── persona-prompts.ts       # System prompt templates for AI calls
├── auth/
│   ├── jwt-verify.ts            # verifyJwt() via jose + JWKS (module-level cache)
│   └── auth-utils.ts            # getUserByWorkosId() D1 query
├── db/
│   └── queries.ts               # insertPersona, getPersona, updatePersona, listPersonas, insertFrame, getFrames
├── helpers/
│   └── assets.ts                # loadHtml() via ASSETS binding
├── optional/                    # Placeholder directories (not implemented)
│   ├── completions/
│   ├── elicitation/
│   ├── prompts/
│   ├── resources/
│   ├── tasks/
│   └── ui/
├── prompts/
│   ├── nowa-persona.ts          # registerNowaPersonaPrompt() — guided onboarding, no argsSchema
│   └── przepisz-z-persona.ts    # registerPrzepiszZPersonaPrompt() — copy rewrite with argsSchema
├── resources/
│   └── ui-resources.ts          # UI_RESOURCES registry, CSP config, CLAUDE_SANDBOX_DOMAIN
├── schemas/
│   ├── inputs.ts                # BuildPersonaInput, RefinePersonaInput, GenerateFrameInput, LoadPersonaInput, ExportPersonaInput
│   └── outputs.ts               # PersonaPayload, FramePayload, PersonaListItem, LoadPersonaPayload, ExportPersonaPayload
├── shared/
│   ├── constants.ts             # SERVER_CONFIG, AI_GATEWAY, AI_TOKEN_BUDGETS
│   └── logger.ts                # Typed structured Logger class (full event union)
└── tools/
    ├── descriptions.ts          # TOOL_METADATA registry, getToolDescription(), getToolExamples()
    ├── index.ts                 # Re-exports all tools + TOOL_METADATA
    ├── build_persona.ts         # buildPersona() — Workers AI draft + D1 insert
    ├── refine_persona.ts        # refinePersona() — delta apply + optional regen + D1 update
    ├── generate_frame.ts        # generateFrame() — Workers AI frame + D1 insert
    ├── load_persona.ts          # loadPersona() — D1 single fetch or list
    └── export_persona.ts        # exportPersona() — render Markdown/JSON inline
```

### Widget Files (`web/widgets/`)
```
web/widgets/
├── widget.html                  # Widget HTML entry point (Vite input)
├── widget.tsx                   # React widget component (~330 lines, full persona UI)
├── components/                  # Widget-local components (persona display, frames, etc.)
└── lib/                         # Widget utilities
```

### Build Output (`web/dist/widgets/`)
```
web/dist/widgets/
└── widget.html                  # Single-file bundle (HTML + CSS + JS inlined via viteSingleFile)
```

### Configuration Files
```
wrangler.jsonc                   # Bindings (ASSETS, DB, AI), routes, observability
package.json                     # Scripts, dependencies
vite.config.ts                   # Vite build config (singlefile, emptyOutDir: false, root: web/)
tsconfig.json                    # TypeScript compiler config (strict, noEmit)
web/tsconfig.json                # Widget TypeScript config
tailwind.config.js               # Tailwind configuration
postcss.config.js                # PostCSS config
components.json                  # shadcn/ui components config
migrations/
└── 0001_persona_tables.sql      # D1 schema (persona_personas + persona_frames)
```

### Common Scripts (`package.json`)
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "dev:widget": "cross-env INPUT=widgets/widget.html vite build --watch",
    "dev:full": "concurrently \"npm run dev\" \"npm run dev:widget\"",
    "build:widget": "cross-env INPUT=widgets/widget.html vite build",
    "build:widgets": "npm run build:widget",
    "watch": "cross-env INPUT=widgets/widget.html vite build --watch",
    "watch:widgets": "npm run watch",
    "deploy": "npm run build:widgets && wrangler deploy",
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run type-check && npm run build:widgets",
    "verify-all": "npm run pre-commit",
    "verify-deploy": "npm ci && npx wrangler deploy --dry-run --outdir /tmp/wrangler-dry-run",
    "cf-typegen": "wrangler types"
  }
}
```

---

**End of Snapshot**

---

## Appendix A: MCP Apps (SEP-1865) Quick Reference

### Two-Part Registration Pattern

**Part 1 — Resource (UI content):**
```typescript
// src/server.ts:66-88
server.registerResource(
  "persona_widget",
  widgetResource.uri,           // "ui://persona-empatia/widget"
  { mimeType: RESOURCE_MIME_TYPE, description: widgetResource.description },
  async () => {
    const templateHTML = await loadHtml(env.ASSETS, "/widget.html");
    return {
      contents: [{
        uri: widgetResource.uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: templateHTML,
        _meta: widgetResource._meta as Record<string, unknown>
        // _meta.ui.csp + domain + prefersBorder set HERE on contents[], not on config
      }]
    };
  }
);
```

**Part 2 — Tool (LLM entry point, linked via `_meta.ui.resourceUri`):**
```typescript
// src/server.ts:95-117
server.registerTool(
  "build_persona",
  {
    title: TOOL_METADATA.build_persona.title,
    description: getToolDescription("build_persona"),
    inputSchema: BuildPersonaInput,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    _meta: { ui: { resourceUri: widgetResource.uri } }  // links to Part 1
  },
  handler
);
```

### Widget Build Configuration (`vite.config.ts`)
```typescript
export default defineConfig({
  root: 'web/',
  plugins: [react(), viteSingleFile()],
  build: {
    rollupOptions: { input: path.resolve(__dirname, 'web', INPUT) },
    outDir: 'dist',          // relative to root → web/dist/widgets/
    emptyOutDir: false,      // CRITICAL: prevents deleting sibling widgets
  },
});
```

---

## Appendix B: AnythingLLM Configuration Example

```json
{
  "mcpServers": {
    "persona-empatia": {
      "url": "https://persona-empatia.wtyczki.ai/mcp",
      "headers": {
        "Authorization": "Bearer <your-jwt-token>"
      }
    }
  }
}
```

---

## Appendix C: Common Architecture Patterns

| Pattern | Server | Description |
|---------|--------|-------------|
| Pattern 1: Stateless External API Server | nbp-exchange | Thin proxy to external REST API, no storage |
| Pattern 2: Stateful OAuth Token Caching | opensky | KV-cached OAuth tokens, user sessions |
| Pattern 3: Pure Widget Server | quiz | All logic in widget bundle, server is auth+asset delivery only |
| **Pattern 4 (Hybrid): AI Generation + D1 Persistence** | **persona-empatia ← THIS SERVER** | Workers AI for generation, D1 for per-user state, multi-session recall |

**Persona-empatia introduces a 4th pattern** not covered by the three canonical references: AI-backed generation (Workers AI) combined with user-scoped persistent state (D1), enabling cross-session recall and incremental refinement. The server is neither stateless (Pattern 1/3) nor OAuth-token-caching stateful (Pattern 2) — it stores domain objects (personas + frames) per user indefinitely.

---

## Appendix D: Checklist References

- `production_docs/MCP_APP_CHECKLIST.md` — full design + UX audit checklist
- `production_docs/MCP_DESIGN_BEST_PRACTICES.md` — 14 core design rules
- `production_docs/MCP_DESIGN_ADVANCED_PATTERNS.md` — situational advanced patterns
- `production_docs/REPORTS_CONVENTION.md` — reports provenance + manifest convention

---

## Appendix E: Quick Commands

### Development
```bash
npm run dev            # wrangler dev (local Worker)
npm run dev:widget     # cross-env INPUT=widgets/widget.html vite build --watch
npm run dev:full       # concurrently: wrangler dev + widget watch
```

### Building & Deployment
```bash
npm run build:widgets  # cross-env INPUT=widgets/widget.html vite build
npm run deploy         # build:widgets + wrangler deploy (local — prefer git push)
npm run verify-deploy  # npm ci + wrangler deploy --dry-run
```

### Secrets Management
```bash
# No server-specific secrets required — AUTHKIT_DOMAIN is a var (not secret)
# Workers AI uses the AI binding (no secret needed)
# Shared secrets set at panel level, not here
```

### Testing
```bash
npm run type-check     # tsc --noEmit
npm run pre-commit     # type-check + build:widgets
```

### D1 Migration (first deployment)
```bash
npx wrangler d1 execute mcp-oauth --file=migrations/0001_persona_tables.sql --remote
```

---

## Appendix F: Persona & Frame Data Schema

The server stores two domain tables in the shared `mcp-oauth` D1 database:

### `persona_personas` Table
```sql
persona_personas (
  user_id       TEXT NOT NULL,           -- from D1 users.user_id
  persona_id    TEXT NOT NULL,           -- UUID from crypto.randomUUID()
  name          TEXT NOT NULL,           -- Polish first name
  age           INTEGER NOT NULL,        -- CHECK (13–99)
  gender        TEXT NOT NULL,           -- CHECK (female|male|nonbinary|other)
  location      TEXT NOT NULL,
  profession    TEXT NOT NULL,
  business      TEXT NOT NULL,           -- original user input (5–500 chars)
  hints         TEXT,                    -- optional user context
  maslow_level  INTEGER NOT NULL,        -- CHECK (1–5)
  triangle_3f   TEXT NOT NULL,           -- JSON: { fuck, food, friends } → sum 100
  motivations   TEXT NOT NULL,           -- JSON: 6 keys, each 0–100 (independent)
  empathy_map   TEXT NOT NULL,           -- JSON: { sees, hears, feels, says, does }
  deep_need     TEXT,                    -- nullable
  pains         TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  dreams        TEXT NOT NULL DEFAULT '[]',  -- JSON string[]
  created_at    TEXT NOT NULL,           -- ISO 8601
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, persona_id)
)
```

### `persona_frames` Table
```sql
persona_frames (
  user_id        TEXT NOT NULL,
  frame_id       TEXT NOT NULL,          -- UUID
  persona_id     TEXT NOT NULL,          -- FK → persona_personas
  frame_type     TEXT NOT NULL,          -- CHECK (aspirational|pain|social)
  text           TEXT NOT NULL,          -- 2–4 sentences Polish sensory copy
  framework_note TEXT,                   -- AI reasoning for why this frame fits
  product_hook   TEXT,                   -- optional product weave-in
  generated_at   TEXT NOT NULL,
  PRIMARY KEY (user_id, frame_id),
  FOREIGN KEY (user_id, persona_id) REFERENCES persona_personas(user_id, persona_id) ON DELETE CASCADE
)
```
