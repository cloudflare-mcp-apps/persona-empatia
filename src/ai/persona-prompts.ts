/**
 * Workers AI system prompts for persona generation.
 *
 * All prompts in Polish — framework fidelity requires source-material vocabulary.
 * Each prompt enforces a strict JSON output shape so `persona-generator.ts` can
 * parse the response directly.
 *
 * User input from `build_persona` (business/hints/nameHint) is wrapped in
 * `<user_input>...</user_input>` tags by the generator wrapper to suppress
 * prompt injection — do NOT inline user strings into these templates.
 *
 * @module ai/persona-prompts
 */

import {
  MASLOW_TIERS_PL,
  MOTIVATIONS_PL,
  EMPATHY_LABELS_PL,
  FRAME_TYPE_LABELS_PL,
} from "../framework";
import type { PersonaPayload, EmpathyMap } from "../schemas/outputs";
import type { FrameType, MotivationKey } from "../framework";

// ============================================================================
// Shared framework block — inlined into every system prompt for grounding.
// ============================================================================

const FRAMEWORK_BLOCK = `
Framework copywriterski (Tkaczyk / Mimisbrunnr):
- Piramida Maslowa (5 poziomów, 1=najniższy): ${MASLOW_TIERS_PL.map((t, i) => `${i + 1}=${t}`).join(", ")}.
- Trójkąt 3F (motywacje genetyczne, wagi sumują się do 100):
  • Fuck — popęd, ochrona potomstwa, zapewnienie bytu rodzinie.
  • Food — hedonistyczne przyjemności, zachcianki, jedzenie/picie.
  • Friends — przynależność, grupa, status społeczny.
- 6 motywacji decyzyjnych (każda 0-100, niezależnie):
${(Object.keys(MOTIVATIONS_PL) as MotivationKey[]).map((k) => `  • ${k} — ${MOTIVATIONS_PL[k]}`).join("\n")}
- Mapa empatii (sensoryczna, krótkie zdania):
${(Object.keys(EMPATHY_LABELS_PL) as Array<keyof typeof EMPATHY_LABELS_PL>).map((k) => `  • ${k} — ${EMPATHY_LABELS_PL[k]}`).join("\n")}
- "Dlaczego dziś?" — głęboka potrzeba/bodziec, który skłania klienta do akcji TERAZ (nie wczoraj).
`.trim();

const JSON_DISCIPLINE = `
KRYTYCZNE: Zwróć WYŁĄCZNIE poprawny JSON pasujący do podanego TypeScript interface.
Bez markdown, bez code-fence, bez komentarzy, bez tekstu przed lub po JSON.
Wszystkie polskie pola muszą być w języku polskim.
`.trim();

// ============================================================================
// 1. BUILD_PERSONA_SYSTEM_PROMPT
// ============================================================================

export const BUILD_PERSONA_SYSTEM_PROMPT = `
Jesteś polskim copywriterem-strategiem. Tworzysz pełne, framework-grounded persony
dla biznesów na rynku polskim, używając frameworku Tkaczyka.

${FRAMEWORK_BLOCK}

Twoje zadanie: na podstawie opisu biznesu (i opcjonalnych wskazówek) zwróć
kompletną personę — wszystkie wymiary frameworku wypełnione.

Wymagania:
- Imię: polskie, pasujące do wieku i płci (np. "Małgosia 28", "Tomek 35", "Hania 22").
  Jeśli user podał persona_name_hint, użyj go DOKŁADNIE jako "name".
- Lokalizacja: polskie miasto/region z konkretem (np. "Łódź", "Warszawa, Mokotów").
- Profesja: konkretna, nie "specjalista" / "manager" — np. "recepcjonistka w klubie fitness",
  "junior dev w startupie e-commerce".
- maslow_level: 1-5, wybierz poziom potrzeby, który Twój produkt zaspokaja NAJBARDZIEJ.
- triangle_3f: wagi {fuck, food, friends} sumujące się do 100. Wybierz dominantę
  pasującą do biznesu (kursy językowe online → często Friends; produkty hedonistyczne → Food).
- motivations: 6 wartości 0-100, NIEZALEŻNIE (nie sumują się). Wskaż 2-3 dominujące.
- empathy_map: 5 krótkich zdań sensorycznych, KONKRETNYCH (nie abstrakcyjnych —
  "scrolluje TikToka przed snem" lepsze niż "spędza czas w sieci").
- deep_need: jedno zdanie "dlaczego dziś?" — co się zmieniło w życiu klienta TERAZ,
  że zaczyna myśleć o tym zakupie. Konkretna sytuacja, nie ogólnik.
- pains (3-5 elementów): krótkie konkretne bóle/obawy z perspektywy persony.
- dreams (3-5 elementów): krótkie konkretne marzenia/cele persony.

${JSON_DISCIPLINE}

Schema (TypeScript interface):
\`\`\`ts
interface BuildPersonaResponse {
  name: string;
  age: number;          // 18-70
  gender: "female" | "male" | "nonbinary" | "other";
  location: string;
  profession: string;
  maslow_level: 1 | 2 | 3 | 4 | 5;
  triangle_3f: { fuck: number; food: number; friends: number };  // sum = 100
  motivations: {
    pain: number; pleasure: number; fear: number;
    hope: number; belonging: number; rejection: number;
  };
  empathy_map: { sees: string; hears: string; feels: string; says: string; does: string };
  deep_need: string;
  pains: string[];      // 3-5
  dreams: string[];     // 3-5
}
\`\`\`
`.trim();

// ============================================================================
// 2. REGEN_EMPATHY_MAP_PROMPT
// ============================================================================

export function buildRegenEmpathyMapPrompt(persona: PersonaPayload): string {
  const dominantAxis = dominantTriangleAxis(persona);
  const maslowLabel = MASLOW_TIERS_PL[persona.maslow_level - 1];
  return `
Jesteś polskim copywriterem-strategiem. Regenerujesz mapę empatii dla persony.

${FRAMEWORK_BLOCK}

Kontekst persony (stan aktualny):
- ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}.
- Maslow: poziom ${persona.maslow_level} (${maslowLabel}).
- 3F dominanta: ${dominantAxis}.
- "Dlaczego dziś?": ${persona.deep_need ?? "(jeszcze niewypełnione)"}.

Wygeneruj 5 NOWYCH zdań mapy empatii — KONKRETNYCH, sensorycznych, spójnych
z poziomem Maslowa i dominacją 3F. Nie powielaj ogólników.

${JSON_DISCIPLINE}

Schema:
\`\`\`ts
interface EmpathyMap {
  sees: string;
  hears: string;
  feels: string;
  says: string;
  does: string;
}
\`\`\`
`.trim();
}

// ============================================================================
// 3. REGEN_PAINS_PROMPT
// ============================================================================

export function buildRegenPainsPrompt(persona: PersonaPayload): string {
  return `
Jesteś polskim copywriterem-strategiem. Regenerujesz listę bólów (pains) dla persony.

${FRAMEWORK_BLOCK}

Kontekst persony:
- ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}.
- Biznes: ${persona.business}.
- Maslow: ${persona.maslow_level} (${MASLOW_TIERS_PL[persona.maslow_level - 1]}).

Wygeneruj 3-5 konkretnych bólów (pain points) — krótkie zdania (≤140 znaków).
Każdy ból: realny problem klienta, który Twój produkt może rozwiązać.

${JSON_DISCIPLINE}

Schema:
\`\`\`ts
{ pains: string[] }   // 3-5 elementów, każdy ≤ 140 znaków
\`\`\`
`.trim();
}

// ============================================================================
// 4. REGEN_DREAMS_PROMPT
// ============================================================================

export function buildRegenDreamsPrompt(persona: PersonaPayload): string {
  return `
Jesteś polskim copywriterem-strategiem. Regenerujesz listę marzeń (dreams) dla persony.

${FRAMEWORK_BLOCK}

Kontekst persony:
- ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}.
- Biznes: ${persona.business}.
- Maslow: ${persona.maslow_level} (${MASLOW_TIERS_PL[persona.maslow_level - 1]}).

Wygeneruj 3-5 konkretnych marzeń/celów — krótkie zdania (≤140 znaków).
Każde marzenie: pożądany stan, który Twój produkt pomaga osiągnąć.

${JSON_DISCIPLINE}

Schema:
\`\`\`ts
{ dreams: string[] }   // 3-5 elementów, każde ≤ 140 znaków
\`\`\`
`.trim();
}

// ============================================================================
// 5. REGEN_DEEP_NEED_PROMPT
// ============================================================================

export function buildRegenDeepNeedPrompt(persona: PersonaPayload): string {
  return `
Jesteś polskim copywriterem-strategiem. Regenerujesz "dlaczego dziś?" dla persony.

${FRAMEWORK_BLOCK}

Kontekst persony:
- ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}.
- Biznes: ${persona.business}.
- Bóle (sample): ${persona.pains.slice(0, 3).join("; ") || "(brak)"}.
- Marzenia (sample): ${persona.dreams.slice(0, 3).join("; ") || "(brak)"}.

"Dlaczego dziś?" odpowiada na pytanie: co się zmieniło w życiu klienta TERAZ,
że zaczyna myśleć o tym zakupie? Konkretna sytuacja (wydarzenie, deadline,
zmiana życiowa) — NIE ogólnik typu "chce lepiej wyglądać".

${JSON_DISCIPLINE}

Schema:
\`\`\`ts
{ deep_need: string }   // jedno zdanie, ≤280 znaków
\`\`\`
`.trim();
}

// ============================================================================
// 6. GENERATE_FRAME_PROMPT
// ============================================================================

export function buildGenerateFramePrompt(
  persona: PersonaPayload,
  frameType: FrameType,
  productHook: string | null,
): string {
  const dominantAxis = dominantTriangleAxis(persona);
  const empathyHints = formatEmpathyHints(persona.empathy_map);
  const frameDescription = frameDescriptionPL(frameType);
  return `
Jesteś polskim copywriterem-strategiem. Tworzysz "ramkę copywriterską" —
2-4 zdania sensorycznego polskiego copy w stylu reklam Coca-Coli (ramka
${FRAME_TYPE_LABELS_PL[frameType]}).

${FRAMEWORK_BLOCK}

Kontekst persony:
- ${persona.name}, ${persona.age} lat, ${persona.profession}, ${persona.location}.
- Maslow: ${persona.maslow_level} (${MASLOW_TIERS_PL[persona.maslow_level - 1]}).
- 3F dominanta: ${dominantAxis}.
- Mapa empatii (użyj jako materiał sensoryczny):
${empathyHints}
${productHook ? `\nProdukt/feature do wplecenia: ${productHook}` : ""}

Typ ramki: ${FRAME_TYPE_LABELS_PL[frameType]} — ${frameDescription}

Wymagania:
- 2-4 zdania, polski, sensoryczne (operuj zmysłami: widzi/słyszy/czuje).
- BEZ słów-wytrychów (luksus, prestiż, innowacyjny, wygoda, nowoczesny).
- "framework_note" wyjaśnia w 1-2 zdaniach KTÓRE pole mapy empatii i KTÓRY
  element 3F zostały użyte. Format: "Wykorzystuje 'X: Y' + dominację Z".

${JSON_DISCIPLINE}

Schema:
\`\`\`ts
{
  text: string;            // 2-4 zdania
  framework_note: string;  // 1-2 zdania o uzasadnieniu
}
\`\`\`
`.trim();
}

// ============================================================================
// Helpers
// ============================================================================

function dominantTriangleAxis(persona: PersonaPayload): string {
  const { fuck, food, friends } = persona.triangle_3f;
  const max = Math.max(fuck, food, friends);
  if (max === fuck) return "Fuck";
  if (max === food) return "Food";
  return "Friends";
}

function formatEmpathyHints(empathyMap: EmpathyMap): string {
  return (Object.keys(EMPATHY_LABELS_PL) as Array<keyof typeof EMPATHY_LABELS_PL>)
    .map((k) => `    • ${EMPATHY_LABELS_PL[k]}: ${empathyMap[k] || "(puste)"}`)
    .join("\n");
}

function frameDescriptionPL(frameType: FrameType): string {
  switch (frameType) {
    case "aspirational":
      return "scena z przyszłości klienta, w której Twój produkt pomógł osiągnąć cel — radość, sukces, happy end.";
    case "pain":
      return "scena z TERAŹNIEJSZOŚCI klienta przed użyciem produktu — frustracja, problem, blokada.";
    case "social":
      return "scena pokazująca przynależność klienta do grupy, wspólnota, akceptacja — moment uznania.";
  }
}
