# Silicon Stack — From Sand to Supercomputer

An interactive, animated single-page guide to how the semiconductor industry works, layer by layer. It is written for smart non-engineers (business and HR professionals) and uses **AT&S**, **ASML** and **NVIDIA** as its three case studies.

Built with Vite, React, TypeScript, Tailwind CSS v4, Framer Motion and Lucide icons. It has no backend.

## Run it

Requires Node.js 18+ (tested on Node 22).

```bash
cd silicon-stack
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run build`   | Type-checks (`tsc -b`) and builds to `dist/`   |
| `npm run preview` | Serves the production build locally            |
| `npm run lint`    | Runs ESLint                                    |

`dist/` is a static site, so you can host it on any static host (Netlify, Vercel, GitHub Pages, S3, …).

## Editing content

**All text lives in [`src/data/industry.ts`](src/data/industry.ts).** You can change wording, companies, quiz questions or glossary terms without touching a component. The file is fully typed, so `npm run build` reports any missing field.

| To change…                         | Edit this export in `industry.ts`                    |
| ---------------------------------- | ---------------------------------------------------- |
| Title, subtitle, footnote, nav     | `site`, `navItems`                                   |
| Section headings & intros          | `sectionIntros`                                      |
| The 9 layers & their detail panels | `layers` (ordered foundation → customers)            |
| AI-chip journey stops              | `journey`                                            |
| AT&S / ASML / NVIDIA deep dives    | `companies`                                          |
| Dependency network                 | `networkNodes` (with x/y positions), `networkEdges`  |
| Business-model comparison          | `businessModels`, `businessModelRows`                |
| Map pins                           | `geoPins` (latitude/longitude + one-line description) |
| Glossary                           | `glossary`                                           |
| Quiz & score messages              | `quiz` (`answer` is the 0-based option index), `quizVerdicts` |

Colours are chosen per item with an `accent` key (`cyan`, `teal`, `amber`, `violet`, `green`, `slate`). Icons use an `icon` key that maps to Lucide icons in `src/components/Icon.tsx`.

### Accuracy rules for editors

- Describe stable industry structure. Avoid precise market shares, prices and revenues.
- If you use a number, write "approx." next to it. The footer carries the note "Figures approximate; verify current data."
- Network lines show typical relationships, not confirmed contracts.
- Technical animations carry a "Simplified for clarity" note. Keep it if you change them.

## Project structure

```
src/
  data/industry.ts          ← all editable content
  components/               shared UI (Nav + scroll progress, headings, MiniStack, icons, accents)
  hooks/                    useMediaQuery, useActiveSection
  sections/
    hero/                   rotating wafer → scroll zoom into transistors
    stack/                  9-layer stack with accordion detail panels
    journey/                horizontal scroll-driven timeline (vertical on mobile)
    companies/              tabbed deep dives + visuals/ (EUV machine, GPU package, substrate)
    network/                interactive SVG dependency graph
    models/                 business-model comparison table / cards
    geography/              stylised dot-matrix world map with pins
    glossary/               searchable glossary
    quiz/                   8-question quiz with instant feedback
```

## Accessibility & motion

- If the user's system has `prefers-reduced-motion` turned on, the scroll-zoom hero, the horizontal journey and the looping animations are swapped for static layouts. All content stays visible.
- Tabs follow the WAI-ARIA tabs pattern (arrow keys, Home and End). Accordions, network nodes and map pins can be reached and used with the keyboard.
- SVG diagrams have titles, descriptions or aria-labels, and each one has an HTML text alternative (step lists, legends, detail panels).
- The layout is responsive. On small screens the stack collapses, the journey turns vertical, the comparison grid becomes cards, and the network diagram scrolls sideways with a company picker underneath.
