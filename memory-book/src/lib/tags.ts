import type { Tag } from "./types";

/** How each tag looks as a stamp, and a gentle prompt to start writing. */
export const TAG_META: Record<Tag, { icon: string; prompt: string; group: "moments" | "ceremonies" }> = {
  First: { icon: "✦", prompt: "The very first time you…", group: "moments" },
  Milestone: { icon: "★", prompt: "Today you learned to…", group: "moments" },
  Festival: { icon: "✿", prompt: "We celebrated together — the food, the people, the noise…", group: "moments" },
  Family: { icon: "♥", prompt: "Who came to see you, and what they said about you…", group: "moments" },
  Funny: { icon: "☺", prompt: "You made us laugh so much when…", group: "moments" },
  Naamkaran: { icon: "ॐ", prompt: "Why we chose your name, and who whispered it in your ear first…", group: "ceremonies" },
  Annaprashan: { icon: "❀", prompt: "Your first taste of rice and kheer — and what you made of it…", group: "ceremonies" },
  Mundan: { icon: "✂", prompt: "Your first haircut — who held you, and how brave you were…", group: "ceremonies" },
  "First Diwali": { icon: "✺", prompt: "Your first Diwali — the diyas, the sweets, the crackers, your face…", group: "ceremonies" },
  "First Holi": { icon: "❂", prompt: "Your first Holi — the colours, the laughter, who coloured you first…", group: "ceremonies" },
};

/** CSS-safe name, e.g. "First Diwali" → "first-diwali". */
export const tagSlug = (tag: Tag) => tag.toLowerCase().replace(/\s+/g, "-");

/** The writing prompt for the most recently chosen tag, or a warm default. */
export function writingPrompt(tags: Tag[], childName: string): string {
  const last = tags.at(-1);
  return last ? TAG_META[last].prompt : `Dear ${childName || "little one"}, today…`;
}
