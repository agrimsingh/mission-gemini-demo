# Mission

A tool for exploring how songs relate to each other through audio embeddings. Upload your music library, and Gemini's multimodal embedding model turns each track into a 1536-dimensional vector. You can then search by text ("warm-up deep house before peak time") or pick any track and find its nearest neighbors in embedding space.

The whole thing runs on Convex as both the database and vector search engine — no separate vector DB.

## How it works

1. You drop audio files into the browser. The app extracts an 80-second representative excerpt from each track (starting ~35% in, not the intro) and uploads both the original and the excerpt to Convex storage.

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

## Project structure

```
src/
  app/            Next.js app router (layout, page, globals.css)
  components/     UI — sidebar, views (library, map, search), upload panel, track table
  lib/            Utilities — PCA projection, audio excerpting, formatting

convex/
  schema.ts       Tracks table with vector index, embedding jobs table
  uploads.ts      File upload + track creation
  embeddings.ts   Background action that calls Gemini
  search.ts       Text-to-audio and track-to-track vector search
  tracks.ts       Queries for listing and fetching tracks
  lib/gemini.ts   Gemini API wrapper
```

## Notes

- The browser handles audio decoding and excerpt extraction. No ffmpeg needed server-side.
- Gemini's embedding endpoint accepts mp3 and wav. The excerpt step always produces wav, so any input format works.
- Convex's vector index uses cosine similarity. The vectors are L2-normalized before storage.
- With only a few tracks, the PCA map won't look like much. The neighborhoods get interesting around 50-60 tracks.
