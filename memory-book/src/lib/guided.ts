/**
 * Guided pages: ready-made, fill-in pages ("Hello, world!", "All about me"…),
 * like a printed baby book. A guided page is a memory with `kind: "guided"`,
 * its `template`, and the answers in `fields` (keyed by the field ids below).
 */

export type GuidedTemplate = "hello" | "about" | "firsts" | "wishes";

export interface GuidedField {
  id: string;
  label: string;
  /** Shown greyed out in the empty box. */
  hint?: string;
  /** "date" fields are filled with a date picker (the firsts). */
  type?: "text" | "date";
}

export interface GuidedTemplateInfo {
  id: GuidedTemplate;
  title: string;
  /** One line for the template chooser. */
  blurb: string;
  emoji: string;
  /** The page's colour accent (a frame colour, see lib/book-style.ts). */
  accent: "sky" | "blush" | "sun" | "lilac";
  fields: GuidedField[];
}

export const GUIDED_TEMPLATES: Record<GuidedTemplate, GuidedTemplateInfo> = {
  hello: {
    id: "hello",
    title: "Hello, world!",
    blurb: "The day you were born",
    emoji: "👋",
    accent: "sky",
    fields: [
      { id: "fullName", label: "My full name", hint: "Mira Sharma" },
      { id: "time", label: "I was born at", hint: "6:42 in the morning" },
      { id: "place", label: "Where", hint: "City Hospital, Pune" },
      { id: "weight", label: "I weighed", hint: "3.2 kg" },
      { id: "length", label: "I was this long", hint: "49 cm" },
      { id: "nameMeaning", label: "My name means", hint: "light, wonder" },
      { id: "firstVisitors", label: "My first visitors", hint: "Nani, Nana and Aunt Riya" },
    ],
  },
  about: {
    id: "about",
    title: "All about me",
    blurb: "Favourites and little habits, right now",
    emoji: "⭐",
    accent: "blush",
    fields: [
      { id: "height", label: "I am this tall", hint: "64 cm" },
      { id: "weight", label: "I weigh", hint: "6.8 kg" },
      { id: "toy", label: "My favourite toy", hint: "the crinkly giraffe" },
      { id: "food", label: "My favourite food", hint: "mashed banana" },
      { id: "song", label: "My favourite song", hint: "Twinkle, twinkle" },
      { id: "laugh", label: "What makes me laugh", hint: "peekaboo with Papa" },
      { id: "nickname", label: "My nicknames", hint: "Mimi, little bean" },
      { id: "canDo", label: "Something new I can do", hint: "roll over all by myself" },
    ],
  },
  firsts: {
    id: "firsts",
    title: "My firsts",
    blurb: "A checklist of big little moments, with dates",
    emoji: "✅",
    accent: "sun",
    fields: [
      { id: "smile", label: "First smile", type: "date" },
      { id: "laugh", label: "First laugh", type: "date" },
      { id: "roll", label: "Rolled over", type: "date" },
      { id: "tooth", label: "First tooth", type: "date" },
      { id: "sat", label: "Sat up", type: "date" },
      { id: "food", label: "First food", type: "date" },
      { id: "crawl", label: "Crawled", type: "date" },
      { id: "word", label: "First word", type: "date" },
      { id: "steps", label: "First steps", type: "date" },
      { id: "haircut", label: "First haircut", type: "date" },
    ],
  },
  wishes: {
    id: "wishes",
    title: "Our wishes for you",
    blurb: "Hopes and dreams, to read when you're older",
    emoji: "🌈",
    accent: "lilac",
    fields: [
      { id: "wish1", label: "We wish you", hint: "a heart full of kindness" },
      { id: "wish2", label: "We hope you'll always", hint: "be curious about everything" },
      { id: "wish3", label: "We hope you'll see", hint: "the mountains, and the sea" },
      { id: "promise", label: "We promise to", hint: "always be there to listen" },
      { id: "from", label: "With love from", hint: "Mama and Papa" },
    ],
  },
};

export const isGuidedTemplate = (value: unknown): value is GuidedTemplate =>
  typeof value === "string" && value in GUIDED_TEMPLATES;

/** The answers, keeping only this template's fields and plain text (a hand-edited file can't break the page). */
export function guidedAnswers(template: GuidedTemplate, fields: unknown): Record<string, string> {
  const raw = (fields && typeof fields === "object" ? fields : {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const f of GUIDED_TEMPLATES[template].fields) {
    const value = raw[f.id];
    if (typeof value === "string" && value.trim()) answers[f.id] = value.trim().slice(0, 120);
  }
  return answers;
}

/** The longest note under the boxes (the page has room for a few lines). */
export const GUIDED_NOTE_LIMIT = 220;
