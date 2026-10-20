import type { Journal, PhotoRef } from "./types";

/**
 * Five sample memories so the design can be explored without signing in.
 * Photos live in /public/demo (see CREDITS.md there).
 */

const photo = (file: string, width: number, height: number): PhotoRef => ({
  fileId: `demo:${file}`,
  width,
  height,
});

const stamp = (date: string) => `${date}T20:00:00.000Z`;

export const demoJournal: Journal = {
  version: 1,
  settings: {
    childName: "Mira",
    dateOfBirth: "2026-05-07",
    bookTitle: "Little Moments",
    coverTheme: "rainbow",
    coverPhoto: photo("yawn.jpg", 1200, 800),
    dedication:
      "For you, my darling girl — so that one day you can read how loved you were, from the very first breath.\n— Mama",
  },
  memories: [
    {
      id: "demo-1",
      date: "2026-05-07",
      title: "Hello, little one",
      text:
        "You arrived at 6:42 in the morning, just as the sky outside the window turned pink. The nurse put you on my chest and you stopped crying the moment you heard my voice. You had a full head of dark hair and the tiniest fingernails I have ever seen.\n\n" +
        "Papa cried more than you did. He kept counting your toes, again and again, as if one might go missing.\n\n" +
        "Your Nani rang four times before lunch. Everybody wanted to know who you look like. I think you look exactly like yourself. The first night I didn't sleep at all — not because you were crying, but because I couldn't stop looking at you. Welcome to the world, my love.",
      tags: ["First", "Family"],
      photos: [photo("newborn-mother.jpg", 803, 1200), photo("tiny-feet.jpg", 1200, 800), photo("hello-tiles.jpg", 1200, 800)],
      createdAt: stamp("2026-05-07"),
      updatedAt: stamp("2026-05-07"),
    },
    {
      id: "demo-2",
      date: "2026-06-02",
      title: "Sleepyhead",
      text:
        "You have decided that sleep only happens in arms. Cot? Absolutely not. Papa's shoulder? Instantly. Today you slept through the doorbell and the pressure cooker whistle — then woke the second I sat down with a hot cup of tea.",
      tags: ["Funny"],
      photos: [photo("sleepyhead.jpg", 1200, 800)],
      createdAt: stamp("2026-06-02"),
      updatedAt: stamp("2026-06-02"),
    },
    {
      id: "demo-3",
      date: "2026-07-11",
      title: "Your first time at the sea",
      text:
        "Your first trip to the sea! You frowned at the wind, then at the sand, then at the waves — and then you laughed out loud for the very first time. A real giggle. We have no idea what was so funny. Papa says it was his hat.",
      tags: ["First"],
      photos: [photo("beach-float.jpg", 1200, 800), photo("blanket-peek.jpg", 1200, 800)],
      createdAt: stamp("2026-07-11"),
      updatedAt: stamp("2026-07-11"),
    },
    {
      id: "demo-4",
      date: "2026-08-28",
      title: "Your first Raksha Bandhan",
      text:
        "Your cousins tied a little rakhi on your wrist (you tried to eat it). The house was full of sweets, marigolds and noise, and you were passed from lap to lap all afternoon like the most precious parcel. Nana says you have his chin.",
      tags: ["Festival", "Family"],
      photos: [photo("family-sofa.jpg", 1200, 801), photo("lifted-high.jpg", 1200, 800)],
      createdAt: stamp("2026-08-28"),
      updatedAt: stamp("2026-08-28"),
    },
    {
      id: "demo-5",
      date: "2026-10-07",
      title: "Five months of you",
      text:
        "Five months old today! You rolled over (once, by accident — you looked very surprised), you grab everything, especially my hair, and the crinkly giraffe is your best friend. Nappies changed so far: Papa says 847.",
      tags: ["Milestone", "Funny"],
      photos: [
        photo("bear-suit.jpg", 900, 1200),
        photo("blue-eyes.jpg", 1200, 960),
        photo("toys.jpg", 1200, 796),
        photo("nappies.jpg", 800, 1200),
      ],
      createdAt: stamp("2026-10-07"),
      updatedAt: stamp("2026-10-07"),
    },
  ],
};
