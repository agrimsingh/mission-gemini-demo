# Mission

A tool for exploring how songs relate to each other through audio embeddings. Upload your music library, and Gemini's multimodal embedding model turns each track into a 1536-dimensional vector. You can then search by text ("warm-up deep house before peak time") or pick any track and find its nearest neighbors in embedding space.

The whole thing runs on Convex as both the database and vector search engine — no separate vector DB.

## How it works

1. You drop audio files into the browser. The app hashes each source file, skips tracks that already exist in the library, then uses ffmpeg.wasm to probe the file, trim an 80-second representative excerpt from each track (starting ~35% in, not the intro), transcode that excerpt to MP3, and upload both the original and the excerpt to Convex storage.

2. Convex schedules a background job that sends the excerpt to Gemini's `gemini-embedding-2-preview` model. The resulting 1536-dim vector gets stored alongside the track.

3. Once tracks are embedded, you can:
   - **Search by vibe** — type a text prompt, Gemini embeds it, Convex vector search returns the closest audio matches
   - **Find neighbors** — pick any track and retrieve the most similar tracks by cosine similarity
   - **Visualize the space** — a PCA projection plots all your embedded tracks on a 2D map

## Stack

- Next.js 16 / React 19
- Convex (database, file storage, vector index, background jobs)
- Gemini API (`@google/genai`) for audio and text embeddings
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

If you already imported tracks before duplicate protection existed, run this once to backfill fingerprints and remove duplicate rows:

```bash
npx convex run maintenance:backfillTrackFingerprintsAndDedupe
```

## Project structure

```
src/
  app/            Next.js app router (layout, page, globals.css)
  components/     UI — sidebar, views (library, map, search), upload panel, track table
  lib/            Utilities — PCA projection, ffmpeg excerpting, formatting

convex/
  schema.ts       Tracks table with vector index, embedding jobs table
  maintenance.ts  One-shot maintenance actions like fingerprint backfill + dedupe
  uploads.ts      File upload + track creation
  embeddings.ts   Background action that calls Gemini
  search.ts       Text-to-audio and track-to-track vector search
  tracks.ts       Queries for listing and fetching tracks
  lib/gemini.ts   Gemini API wrapper
```

## Notes

- The browser handles audio probing, trimming, and transcoding with ffmpeg.wasm. No ffmpeg needed server-side.
- Excerpts are always normalized to MP3 before embedding, even if the source file was AIFF, WAV, FLAC, or something else the browser batch import accepts.
- Source files are fingerprinted with SHA-256 so re-importing the exact same track gets skipped instead of creating duplicate rows.
- Convex's vector index uses cosine similarity. The vectors are L2-normalized before storage.
- With only a few tracks, the PCA map won't look like much. The neighborhoods get interesting around 50-60 tracks.
