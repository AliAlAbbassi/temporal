# Temporal

A manga reading webapp built with SvelteKit. Clean, fast, mobile-first reader with multi-source support.

## Features

- **Multi-source** — Aggregates manga from MangaDex and MangaPill, with more sources coming
- **Dual reading modes** — Paged (RTL tap zones, swipe gestures) and vertical scroll
- **Reading progress** — Tracks your position per manga, synced to localStorage
- **Library** — Bookmark manga for quick access
- **PWA** — Install as a standalone app on mobile for a native-like experience
- **Image proxying** — Server-side proxy handles CORS and hotlink protection

## Tech Stack

- **SvelteKit** (Svelte 5) + TypeScript
- **Tailwind CSS v4**
- **Cloudflare Pages** (adapter-cloudflare)
- **localStorage** for persistence

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Building

```bash
npm run build
npm run preview
```

## Deployment

Configured for Cloudflare Pages:

```bash
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Sources

| Source | Type | Coverage |
|--------|------|----------|
| MangaDex | API | Legal/community scanlations |
| MangaPill | Scraper | Broader catalog including licensed series |

## Project Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── mangadex.ts     # MangaDex API client
│   │   ├── mangapill.ts    # MangaPill scraper
│   │   └── sources.ts      # Multi-source dispatcher
│   ├── components/
│   │   ├── MangaGrid.svelte
│   │   └── SearchBar.svelte
│   └── stores/
│       └── progress.ts     # localStorage persistence
├── routes/
│   ├── +page.svelte        # Home (search, library, continue reading)
│   ├── manga/[id]/         # Manga detail + chapter list
│   ├── read/[chapterId]/   # Reader (paged + scroll modes)
│   └── api/                # Server-side API routes + image proxies
└── app.css                 # Theme + global styles
```
