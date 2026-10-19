# Memory Book — build plan

## Stages

| Stage | What | Status |
| --- | --- | --- |
| 1 | Book design with dummy data: cover, endpapers, title page, memory page layouts, page-turn, timeline, demo mode | **done — waiting for your review** |
| 2 | Google sign-in (Auth.js) + Google Drive storage (`drive.file` scope), folder + `journal.json`, photo loading with thumbnail cache, token refresh | next |
| 3 | Add / edit / delete memory flow (mobile-first), photo resize to 2000px, EXIF date, offline drafts, settings page | |
| 4 | PDF export (whole book or a date range, A4 or 8×8 in) | |

## Key decisions

- **One codebase for demo and real books.** Every page is drawn from a plain `Journal` object
  (`src/lib/types.ts`). Demo mode passes in sample data; stage 2 passes in the one loaded from Drive.
- **Photos are resolved through a "photo source"** (`PhotoSource.tsx`). Demo serves `/public/demo`;
  Drive will fetch with the signed-in user's token and cache thumbnails in the browser.
- **Everything on a page is sized in `cqw`** (1% of the page width), so the same page design
  scales from a phone to a printed page — this is what the PDF export will reuse.
- **"Random" touches are seeded** by the memory id, so a photo's tilt and tape colour never
  change between visits.
- **Page-flip:** StPageFlip (`page-flip`) handles the animation and swipe; on narrow screens it
  shows one page at a time automatically.
- **No database.** All data lives in `journal.json` in the user's Drive. The data access will sit
  behind a small interface so a database can replace it later for multi-user.

## Folder structure

```
memory-book/
├─ public/demo/              sample photos for demo mode (+ CREDITS.md)
├─ src/
│  ├─ app/                   Next.js routes
│  │  ├─ page.tsx            landing page
│  │  ├─ demo/               demo book  (/demo) and timeline (/demo/timeline)
│  │  ├─ book/               your real book (stage 2)
│  │  ├─ api/auth/           Google sign-in (stage 2)
│  │  └─ globals.css         the paper, cloth, tape, polaroid styling
│  ├─ components/
│  │  ├─ book/               FlipBook (page-turn), BookPages (cover, memory pages…),
│  │  │                      PhotoFrame (polaroid / tape / corners), Doodles
│  │  ├─ timeline/           timeline grid
│  │  ├─ editor/             add/edit memory flow (stage 3)
│  │  └─ ui/                 top bar, icons
│  └─ lib/
│     ├─ types.ts            journal.json shape
│     ├─ dates.ts            age stamp ("5 months, 12 days old"), date formats
│     ├─ pagination.ts       journal → ordered book pages (long memories continue overleaf)
│     ├─ layout.ts           where photos sit on a page (1 / 2 / 3 / 4 photo layouts)
│     ├─ frames.ts           photo frame geometry, tape colours, doodle kinds
│     ├─ random.ts           seeded randomness
│     ├─ demo-data.ts        the 5 sample memories
│     └─ drive/              Google Drive client (stage 2)
└─ README.md                 setup guide
```
