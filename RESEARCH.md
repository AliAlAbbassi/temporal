# Manga Reader Webapp - Research

## 1. Manga Sources

### MangaDex API (Primary Source)

The best option. Free, ad-free, community-driven, well-documented REST API. No auth needed for reading.

**Base URL:** `https://api.mangadex.org`

**Key flows:**
```
Search:     GET /manga?title=one+piece&limit=10
Details:    GET /manga/{id}?includes[]=cover_art&includes[]=author
Chapters:   GET /manga/{id}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=100
Pages:      GET /at-home/server/{chapter_id}  →  {baseUrl}/data/{hash}/{filename}
Covers:     https://uploads.mangadex.org/covers/{manga_id}/{filename}  (.256.jpg / .512.jpg)
```

**Rate limit:** ~5 req/s per IP. Max `limit` = 100 (500 for feeds). `offset + limit <= 10,000`.

**CORS caveat:** MangaDex blocks image hotlinking from non-MangaDex domains. We MUST proxy images through our backend. `localhost` is whitelisted for dev.

**Data-saver mode:** `{baseUrl}/data-saver/{hash}/{filename}` — compressed images, good for mobile/slow connections.

### Multi-Source Options

| Approach | Pros | Cons |
|----------|------|------|
| **MangaDex only** | Simple, well-documented API, no auth | Single source |
| **Consumet (self-hosted)** | Unified TypeScript API across MangaDex, Mangasee, Mangakakalot, etc. | Must self-host, public API is dead |
| **Suwayomi-Server** | Runs 200+ Tachiyomi/Mihon extensions via GraphQL | Requires JVM, heavy |
| **Roll-your-own adapter pattern** | Lightweight, full control | Must implement each source manually |

**Decision:** Start with MangaDex only. Design a source adapter interface so we can add more later.

```typescript
interface MangaSource {
  name: string;
  searchManga(query: string): Promise<MangaResult[]>;
  getMangaDetails(id: string): Promise<MangaDetails>;
  getChapterList(mangaId: string): Promise<Chapter[]>;
  getPageList(chapterId: string): Promise<string[]>;
}
```

---

## 2. Tech Stack

### Frontend: SvelteKit

Why SvelteKit over Next.js/Nuxt/Remix:
- **Smallest bundle size.** Svelte compiles away the framework — less JS = faster mobile TTI.
- No virtual DOM overhead → smoother page transitions and gestures in the reader.
- Svelte 5 runes give fine-grained reactivity for reader state (page, zoom, scroll).
- SvelteKit deploys to Cloudflare Pages via `@sveltejs/adapter-cloudflare`.
- PWA support via `vite-plugin-pwa`.
- A manga reader is fundamentally simple (display images, track progress, swipe pages) — doesn't need a massive ecosystem.

**Tradeoff:** No built-in `<Image>` component like Next.js. We handle responsive images + lazy loading ourselves (or use Cloudflare Images / imgproxy).

### Delivery: PWA

PWA covers everything we need:
- **Offline reading** via Service Workers + Cache API (a chapter = 20-40 images @ 200-500KB each = 4-20MB, well within SW limits)
- **Full-screen** via `display: standalone` in manifest
- **Touch gestures** — swipe, pinch-to-zoom, tap zones all work natively in browsers
- **Home screen install** on both Android and iOS
- **Background sync** for queuing chapter downloads

**iOS limitation:** SW cache limited to ~50MB per origin. Can cache several chapters ahead, not an entire series. Good enough.

**Wake lock:** Screen Wake Lock API works in Chrome/Edge. Not in Safari yet — minor issue.

### Hosting: Cloudflare Pages

**$0/month** and it's not even close:
- **Unlimited bandwidth** (killer for an image-heavy app)
- 100K Worker requests/day on free tier (~3,300/hour, way more than enough for personal use)
- V8 isolates, not containers → minimal cold starts

### Database: Cloudflare D1

SQLite at the edge, co-located with the app.
- **Free tier:** 5GB storage, 5M reads/day, 100K writes/day
- Only accessible from Cloudflare Workers (locked to CF ecosystem, but we're already there)
- Perfect for our tiny data model: preferences, library, reading progress

**Alternative if we want flexibility:** Turso (libSQL) — 9GB free storage, 500 databases, works from anywhere.

### Image Proxy/Storage: Cloudflare R2

- **Free:** 10GB storage, zero egress fees
- We proxy MangaDex images through our Worker → cache in R2
- Beyond 10GB: $0.015/GB/month

### Auth: Cloudflare Access

Zero auth code in the app. Put it behind CF Access, allow only our email. Free for up to 50 users. Session lasts 30+ days.

**Alternative:** Simple password with bcrypt + long-lived HTTP-only cookie. Or passkeys for the best mobile UX.

### Full Stack Summary

| Layer | Choice | Cost |
|-------|--------|------|
| Frontend | SvelteKit | $0 |
| Delivery | PWA | $0 |
| Hosting | Cloudflare Pages | $0 |
| Database | Cloudflare D1 | $0 |
| Image proxy | Cloudflare Workers + R2 | $0 |
| Auth | Cloudflare Access | $0 |
| **Total** | | **$0/month** |

---

## 3. Image Optimization

### Format Strategy

Manga = mostly B&W line art with screentone patterns. Highly compressible.

| Format | Quality/Size | Browser Support | Decode Speed (mobile) |
|--------|-------------|-----------------|----------------------|
| **WebP** (lossy q=90) | ~150-250KB/page | 97%+ | Fast (50-100ms) |
| **AVIF** (q=80) | ~100-180KB/page | Good (Chrome, FF, Safari 16.4+) | Slower (200-500ms on older SoCs) |
| **JPEG XL** | Best for manga | Dead in Chrome, Safari only | N/A |

**Decision:** Primary = WebP. Serve AVIF via `<picture>` with WebP fallback for browsers that support it.

**Grayscale encoding saves ~30%:**
```bash
cwebp -q 90 -preset drawing input.png -o output.webp
```
```javascript
sharp(input).grayscale().webp({ quality: 90 }).toFile(output)
```

Since MangaDex serves its own formats, we mostly serve what they give us. But if we ever cache/re-encode, use the above.

### Rendering

- Use `<img decoding="async" fetchpriority="high">` for the current page
- Pre-decode next pages with `img.decode()` — resolves when image is ready to paint, zero jank on navigation
- `100dvh` (not `100vh`) for full-screen — handles mobile browser chrome correctly
- `object-fit: contain` for fitting pages to screen

### Placeholders

**ThumbHash** over BlurHash — better for manga's high contrast. 28 bytes per image, inline in JSON payload.

Progressive loading chain:
1. ThumbHash (instant, from chapter metadata)
2. Low-res preview (360px wide, ~20KB) — optional
3. Full resolution (1440px, quality-adaptive based on DPR and connection speed)

### Preloading Strategy

- Keep 5-7 decoded images in memory max (each 1440x2048 RGBA = ~12MB GPU memory)
- Preload 2-3 pages ahead in reading direction
- Evict pages >4 positions away from current
- Use `fetchpriority="low"` on preloaded images to avoid competing with the current page

### DPR-Aware Sizing

```javascript
function getOptimalWidth(containerWidth) {
  const dpr = Math.min(devicePixelRatio || 1, 3);
  const physical = containerWidth * dpr;
  const breakpoints = [720, 1080, 1440, 1800, 2160];
  return breakpoints.find(bp => bp >= physical) || breakpoints.at(-1);
}
```

### Network-Aware Quality

```javascript
const conn = navigator.connection;
if (conn?.saveData) return { quality: 60, maxWidth: 720 };
if (conn?.effectiveType === '2g') return { quality: 50, maxWidth: 540 };
if (conn?.effectiveType === '3g') return { quality: 70, maxWidth: 1080 };
return { quality: 90, maxWidth: 1440 };
```

### Service Worker Caching

- **Cache-first** for manga page images (immutable content)
- **Stale-while-revalidate** for app shell
- Cache management: cap at ~500MB, LRU eviction tracked in IndexedDB
- Expose `PRECACHE_CHAPTER` and `EVICT_CHAPTER` messages to preload/cleanup chapters

---

## 4. UX Patterns

### Reading Modes

Must support both:

**Page-by-page** (traditional manga):
- CSS `scroll-snap-type: x mandatory` with `direction: rtl` for Japanese manga
- Tap zones: left 1/3 = next page, right 1/3 = previous page, center = toggle HUD (reverse for LTR)
- Swipe gestures for navigation
- Keep only 3 images in memory (prev, current, next) — low memory pressure

**Vertical scroll** (webtoon/manhwa):
- Virtualized scroll with IntersectionObserver
- `content-visibility: auto` + `contain: strict` — browser skips layout/paint for off-screen pages
- `contain-intrinsic-size` to maintain stable scroll positions
- Load 2 viewports ahead, unload 4+ viewports away

### HUD Design

The overlay should be minimal and get out of the way:
- **Tap center** of screen to toggle HUD on/off
- **Top bar:** Chapter title, back button, settings gear
- **Bottom bar:** Page slider/scrubber, current page indicator (e.g., "12 / 38"), chapter nav (prev/next chapter)
- Auto-hide after 3 seconds of inactivity
- Translucent background so you can still see the page

### Gestures

| Gesture | Action |
|---------|--------|
| Tap left/right | Navigate pages (direction depends on reading mode) |
| Tap center | Toggle HUD |
| Swipe left/right | Navigate pages |
| Pinch | Zoom (1x → 5x, snap back to 1x on release below 1.05x) |
| Double-tap | Toggle between 1x and 2.5x zoom, centered on tap point |
| Swipe down (at first page) | Exit reader / go to chapter list |

### Library/Browse UX

- **Grid layout** with cover art thumbnails (MangaDex provides .256.jpg and .512.jpg cover sizes)
- Search bar with instant results (MangaDex search is fast)
- Continue Reading section at top (most recently read, with progress indicator)
- Manga detail page: cover, title, author, description, genre tags, chapter list
- Chapter list: sortable by number, read/unread indicators (filled/hollow dot), grouped by volume

### Dark Mode / OLED

- Default: true black (#000) background in the reader for OLED power saving
- Library/browse: dark gray (#121212) background to distinguish from the reader
- Theme options: Dark (default), Light, System
- Optional warm/sepia filter for night reading (CSS filter overlay)
- Reader background is always dark regardless of theme — manga pages are white, dark surround improves perceived contrast

### Reading Progress

- Save progress (chapter + page) to D1 on every page turn (debounced)
- Also save to IndexedDB immediately for instant local feedback
- "Continue Reading" button on manga detail page
- Visual progress bar on library grid cards (thin bar at bottom showing % through series)
- Chapter list marks read chapters with a filled indicator

### Transitions & Loading States

- Page transitions: simple crossfade (150ms) or instant swap — avoid fancy animations that slow down reading
- Shimmer skeleton with correct aspect ratio while loading
- Smooth scroll-snap for paged mode
- Chapter boundary: brief "Chapter X" overlay (1s) then auto-advance, or "Next Chapter →" button

### What Users Love (from app reviews)

- Clean, uncluttered interface
- Fast image loading with no interruptions
- Reliable reading progress that resumes exactly where you left off
- Offline reading capability
- No ads (we're building for personal use, so this is free)

### What Users Hate

- Search that doesn't work properly
- Pages failing to load with no retry mechanism
- Having to scroll to find "continue reading"
- Being thrown back to chapter 1 instead of resuming

---

## 5. Architecture

```
┌──────────────────────────────────┐
│         SvelteKit PWA            │
│  (Cloudflare Pages)              │
│                                  │
│  ┌──────────┐  ┌──────────────┐  │
│  │ Library  │  │   Reader     │  │
│  │ Browse   │  │  (paged/     │  │
│  │ Search   │  │   scroll)    │  │
│  └──────────┘  └──────────────┘  │
│         │              │         │
│    Service Worker (cache-first   │
│    for images, SWR for shell)    │
└──────────┬───────────────────────┘
           │
    Cloudflare Worker (API + Image Proxy)
           │
     ┌─────┴──────┐
     │             │
  D1 (SQLite)   MangaDex API
  - preferences  - search
  - library      - chapters
  - progress     - page images
                   (proxied → R2 cache)
```

**Image flow:**
1. Client requests `/api/pages/{chapterId}/{pageIndex}`
2. Worker checks R2 cache → if hit, serve directly
3. If miss, fetch from MangaDex at-home server → store in R2 → serve to client
4. Client caches in Service Worker for offline access

This keeps us under MangaDex rate limits and gives us CDN-speed image delivery.
