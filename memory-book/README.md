# Memory Book

A digital baby journal that looks and feels like a real, hand-made keepsake book —
cream paper, polaroids, washi tape, handwriting and a page-turn you can swipe.
Photos and words are stored in **your own Google Drive**.

> **Status:** stage 1 of 4 (the book design, with demo data). Google sign-in, adding
> memories and PDF export are coming in the next stages — see [PLAN.md](PLAN.md).

## See it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer (download the "LTS" installer).

1. Open a terminal in this `memory-book` folder.
2. Install the app's building blocks (only needed once):
   ```bash
   npm install
   ```
3. Start it:
   ```bash
   npm run dev
   ```
4. Open <http://localhost:3000> in your browser and click **Open the demo book**.

Turn pages by clicking or dragging a page corner, swiping on a phone, using the arrow buttons,
or pressing ← / → on the keyboard. **Timeline** shows every memory; tap one to jump to its page.

To try the phone layout on a computer, make the browser window narrow — the book switches to
one page at a time.

## Demo mode

`/demo` shows five sample memories for "Mira", born 7 May 2026, so you can see the design
without logging in. Demo photos are from Unsplash (see `public/demo/CREDITS.md`).

## Setup guides (coming with stage 2)

Step-by-step instructions for creating the Google Cloud project, enabling the Drive API,
setting up the OAuth consent screen (Testing mode + test users), environment variables and
deploying to Vercel will be added here in stage 2, when they are needed.
