# Memory Book — build plan

## Stages

| Stage | What | Status |
| --- | --- | --- |
| 1 | Book design with dummy data: cover, endpapers, title page, memory page layouts, page-turn, timeline, demo mode | done |
| 2 | Google sign-in (Auth.js) + Google Drive storage (`drive.file` scope), folder + `journal.json`, photo loading with thumbnail cache, token refresh | done |
| 3 | Add / edit / delete memory flow (mobile-first), photo resize to 2000px, EXIF date, offline drafts, settings page | done |
| 4 | PDF export (whole book, a year of life, a calendar year or custom dates; A4 or 8×8 in) | done |

### Possible next steps

- One book shared between several Google accounts (needs the Google Picker or a wider Drive scope).
- Installable app with full offline reading (service worker).
- Reordering photos by drag and drop; captions on polaroids.

## Key decisions

- **One codebase for demo and real books.** Every page is drawn from a plain `Journal` object
  (`src/lib/types.ts`). Demo mode passes in sample data; signed in, it is the one loaded from Drive.
- **Photos are resolved through a "photo source"** (`PhotoSource.tsx`). Demo serves `/public/demo`;
  Drive photos are fetched with the signed-in user's token and cached in the browser.
- **Everything on a page is sized in `cqw`** (1% of the page width), so the same page design
  scales from a phone to a printed page — the PDF export reuses it.
- **"Random" touches are seeded** by the memory id, so a photo's tilt and tape colour never
  change between visits.
- **Page-flip:** StPageFlip (`page-flip`) handles the animation and swipe; on narrow screens it
  shows one page at a time automatically.
- **No database.** All data lives in `journal.json` in the user's Drive, behind the small
  `JournalRepository` interface (`src/lib/repository.ts`) so a database can replace it for multi-user.
- **Drive is called from the browser** with the user's token (refreshed by Auth.js on the server),
  so photos never pass through Vercel and its upload limits don't apply.
- **Saving is local-first.** A new or edited memory is written to IndexedDB, then uploaded; it is
  only removed from the device once Drive has it. `journal.json` is re-read before every write so
  two devices don't overwrite each other.
- **PDF export uses the browser's print engine** on a page laid out at the exact paper size —
  vector text and every visual effect survive, which image-based PDF libraries can't do.

## Folder structure

```
memory-book/
├─ public/demo/              sample photos for demo mode (+ CREDITS.md)
├─ src/
│  ├─ app/                   Next.js routes
│  │  ├─ page.tsx            landing page
│  │  ├─ demo/               demo book  (/demo) and timeline (/demo/timeline)
│  │  ├─ book/               your real book: reader, timeline, new, edit/[id], settings, setup, export
│  │  ├─ api/auth/           Google sign-in (Auth.js)
│  │  └─ globals.css         the paper, cloth, tape, polaroid styling
│  ├─ components/
│  │  ├─ book/               FlipBook (page-turn), BookPages (cover, memory pages…),
│  │  │                      PhotoFrame (polaroid / tape / corners), Doodles
│  │  ├─ timeline/           timeline grid
│  │  ├─ editor/             add/edit memory form
│  │  ├─ export/             PDF export
│  │  ├─ journal/            JournalProvider (load/save/offline queue), loading & error states
│  │  ├─ settings/           settings and first-time setup
│  │  └─ ui/                 top bar, icons
│  └─ lib/
│     ├─ types.ts            journal.json shape
│     ├─ dates.ts            age stamp ("5 months, 12 days old"), date formats
│     ├─ pagination.ts       journal → ordered book pages (long memories continue overleaf)
│     ├─ layout.ts           where photos sit on a page (1 / 2 / 3 / 4 photo layouts)
│     ├─ frames.ts           photo frame geometry, tape colours, doodle kinds
│     ├─ random.ts           seeded randomness
│     ├─ demo-data.ts        the 5 sample memories
│     ├─ page-format.ts      screen / A4 / square page shapes
│     ├─ repository.ts       storage interface
│     ├─ drive/              Google Drive client + DriveRepository
│     ├─ images.ts           resize to 2000px, thumbnails, EXIF date
│     ├─ photo-cache.ts      cached, authenticated photo loading
│     └─ idb.ts              tiny IndexedDB helper
├─ src/auth.ts               Google sign-in config + token refresh
└─ README.md                 setup guide
```
