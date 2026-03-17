# Mission

A tool for exploring how songs relate to each other through audio embeddings. Upload your music library, and Gemini's multimodal embedding model turns each track into a 1536-dimensional vector. You can then search by text ("warm-up deep house before peak time"), pick any track and find its nearest neighbors in embedding space, or browse the whole library on a 2D PCA map.

The whole thing runs on Convex as both the database and vector search engine — no separate vector DB.

## How it works

1. You drop audio files into the browser (or select a folder). The app hashes each source file with SHA-256, skips tracks that already exist in the library, then uses ffmpeg.wasm to probe the file, extract TBPM metadata, trim an 80-second representative excerpt from each track (starting ~35% in, not the intro), transcode that excerpt to mono MP3 (16 kHz / 96 kbps), and upload it to Convex storage. Multiple files are processed with bounded concurrency and per-file progress.

2. Convex schedules two background jobs per track:
   - **Embedding** — sends the excerpt to Gemini's `gemini-embedding-2-preview` model and stores the resulting 1536-dim vector.
   - **Description** — sends the excerpt to `gemini-3.1-flash-lite-preview` with a prompt that produces a short "crate note" (genre, mood, instruments, energy) without mentioning BPM/tempo (that comes from ffmpeg).

3. Once tracks are embedded, you can:
   - **Browse the library** — click any track to see its crate note, BPM, duration, and excerpt range. Play excerpts inline with low-latency audio preview.
   - **Explore the map** — a PCA projection plots all embedded tracks on a 2D scatterplot. Click a point to see its nearest neighbors with similarity scores and connecting lines.
   - **Vibe Search** — type a text prompt, Gemini embeds it, and Convex vector search returns the closest audio matches. Try example prompts or hand-off results to the map for spatial context.

## Stack

- Next.js 16 / React 19
- Convex (database, file storage, vector index, background jobs)
- Gemini API (`@google/genai`) for audio embeddings, text embeddings, and audio descriptions
- ffmpeg.wasm for client-side audio probing, transcoding, and BPM extraction
- Tailwind CSS v4
- motion/react for transitions

## Getting started

You need a Convex account and a Gemini API key.

```bash
npm install
```

Create `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=<your convex deployment url>
GEMINI_API_KEY=<your gemini api key>
```

Start Convex and the dev server in separate terminals:

```bash
npx convex dev
npm run dev
```

Open `http://localhost:3000`. Upload some tracks (the more the better — 50+ gives you a more interesting map) and wait for embeddings to finish.

### Maintenance commands

If you imported tracks before duplicate protection existed, backfill fingerprints and remove duplicates:

```bash
npx convex run maintenance:backfillTrackFingerprintsAndDedupe
```

If tracks are missing BPM or crate notes (e.g. imported before detail hydration), backfill them:

```bash
npx convex run maintenance:backfillTrackDetails
```

The app also auto-hydrates missing details in the background when you open the library.

## Project structure

```
src/
  app/              Next.js app router (layout, page, globals.css)
  components/
    app-shell.tsx        Root layout with sidebar
    demo-workspace.tsx   Main workspace — view routing, global state, auto-hydration
    sidebar.tsx          Navigation sidebar (Library, Map, Vibe Search)
    library-view.tsx     Upload panel + track table + sticky track details
    track-table.tsx      Virtualized track list with fixed-column layout
    upload-panel.tsx     Drag-and-drop ingest with ffmpeg.wasm, concurrency, per-file progress
    map-view.tsx         2D PCA scatterplot with neighbor lines and similarity scores
    search-view.tsx      Vibe Search — prompt-to-audio retrieval with examples and explainer
    audio-preview-button.tsx  Global single-instance audio player (useSyncExternalStore)
    providers.tsx        Convex client provider
  lib/
    audio.ts         ffmpeg.wasm excerpting, transcoding, TBPM extraction
    pca.ts           PCA projection for 2D map
    format.ts        Time and BPM formatting
    cn.ts            Tailwind class merging

convex/
  schema.ts          Tracks table with vector index, embedding jobs table
  uploads.ts         File upload, track creation with fingerprint dedup
  embeddings.ts      Background action — calls Gemini embedding API
  descriptions.ts    Background action — Gemini audio description + BPM hydration
  search.ts          Text-to-audio and track-to-track vector search
  tracks.ts          Queries and mutations for track data
  maintenance.ts     One-shot actions: fingerprint backfill, dedupe, detail backfill
  migrations.ts      Schema migration helpers
  lib/gemini.ts      Gemini API wrapper (embeddings + generative)
```

## Notes

- The browser handles audio probing, trimming, BPM extraction, and transcoding with ffmpeg.wasm. No ffmpeg needed server-side.
- Excerpts are always normalized to mono MP3 before embedding, even if the source was AIFF, WAV, FLAC, or another format.
- Source files are fingerprinted with SHA-256 so re-importing the exact same track is skipped.
- Track descriptions ("crate notes") are generated by Gemini from the audio excerpt. BPM comes from ffmpeg TBPM metadata, not from Gemini — the AI prompt explicitly excludes tempo to avoid hallucinated values.
- Audio preview uses a single shared `HTMLAudioElement` managed via `useSyncExternalStore` for low-latency playback without re-render storms.
- The track table is virtualized with fixed row heights and stable column widths for smooth scrolling with large libraries.
- Convex's vector index uses cosine similarity. The vectors are L2-normalized before storage.
- With only a few tracks, the PCA map won't look like much. The neighborhoods get interesting around 50-60 tracks.
