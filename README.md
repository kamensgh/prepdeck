# Prepdeck

Interview practice as a card game: pick an industry and role, shuffle the deck, and answer the question you're dealt, with notes on what a strong answer needs.

v1 covers **Technology → Software Engineering** (Frontend: React, Next.js · Backend: Node.js, Python · Fullstack: React, Next.js, Node.js) and **Mergers & Acquisitions**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no Sanity settings the app runs on the built-in seed questions in `lib/content/seed.ts`.

```bash
npm test           # deck logic + importer
npm run typecheck
npm run build
```

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · [Motion](https://motion.dev) · Sanity (question bank) · Zod. Fonts are self-hosted from npm (Bricolage Grotesque, Plus Jakarta Sans).

## How content works

The question bank lives in Sanity, so reviewers can add or fix questions at any time without a deploy.

1. An editor publishes a change in Sanity Studio (`studio/`).
2. A Sanity webhook calls `POST /api/revalidate`, which checks the signature and runs `revalidateTag('questions')`.
3. The next visitor gets the new content. Between edits the app serves a cached copy.

Only questions with **Review = Approved** reach the app.

Every question is tagged at the most general layer where it applies:
Universal → Industry → Role family → Specialisation → Stack, with level as a filter. See `lib/deck.ts` for the matching rule.

### Set up Sanity

1. Create a project at sanity.io and copy its project ID.
2. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_SANITY_PROJECT_ID`, `SANITY_API_READ_TOKEN` and a random `SANITY_REVALIDATE_SECRET`.
3. Studio: `cd studio && npm install && SANITY_STUDIO_PROJECT_ID=... npm run dev`.
4. Add a webhook in Sanity (API → Webhooks): URL `https://<your-domain>/api/revalidate`, trigger on create/update/delete, filter `_type in ["question","industry","roleFamily","specialisation"]`, secret = `SANITY_REVALIDATE_SECRET`.

### Import the pilot question bank

Export the question bank doc as Markdown, then:

```bash
npm run import:bank -- ~/Downloads/question-bank.md   # writes question-bank.ndjson, reports bad rows
cd studio && npm run import                            # loads it into the production dataset
```

IDs are stable (`question-FE-01`), so re-importing updates rather than duplicates.

## Project layout

```
app/                      routes: industries → roles → practice table; /api/revalidate
components/Deck.tsx       shuffle styles (Riffle, Fan, Instant), dealing, keyboard controls
components/QuestionCard   dealt card with flip-in animation
components/TipsPanel      what they're asking / strong answer covers / avoid
lib/content/              Zod schema, Sanity source with tagged caching, dev seed
lib/deck.ts               deck filtering + Fisher–Yates shuffle
scripts/                  question bank Markdown → Sanity NDJSON importer
studio/                   Sanity Studio config and schema
```

## Next up

- Install Kokonut UI and Bklit UI components via the shadcn CLI (`npx shadcn@latest add @kokonutui/...`, `@bklit/...`) for the animated buttons/backgrounds and the session summary chart.
- Practice timer, favourites, self-rating and session summary (P1 in the PRD).
- Analytics: Vercel Analytics or PostHog (open decision).
