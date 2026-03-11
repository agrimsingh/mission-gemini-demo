## Learned User Preferences

- Plan before coding on complex/multi-file tasks — propose architecture and get approval before writing code
- Black and near-black color palettes only — no blues, cyan, purple, or colored gradients
- Reject generic AI aesthetics: no system fonts, no Inter/Roboto/Arial, no purple-on-white, no generic glassmorphism
- Prefer technical/utilitarian font choices that match the project's context (currently Chakra Petch + Manrope)
- UI elements should be contained/bounded — never let a component grow unbounded to fill the viewport and force scrolling
- Don't cram features into one view — split into focused views with navigation
- Test visually as you go — take screenshots to verify changes during development
- Use Tailwind CSS utilities and theme tokens for all styling, not custom CSS classes
- Use motion/react for JavaScript animations, following Emil Kowalski's animation patterns (ease-out default, <300ms, transform+opacity only)
- Batch operations should support configurable parallelism/concurrency

## Learned Workspace Facts

- Stack: Next.js 16 (App Router) + React 19 + Convex (backend + vector DB) + Gemini multimodal embeddings
- Styling: Tailwind CSS v4 with @theme tokens, clsx + tailwind-merge via cn() utility
- Icons: lucide-react
- Animations: motion/react (formerly framer-motion)
- Audio processing: browser-side excerpt extraction (~80s from ~35% into track), no server-side ffmpeg
- Convex serves as both the database and vector search engine (no separate vector DB)
- Gemini model for embeddings: gemini-embedding-2-preview, 1536-dimensional vectors
- App architecture: sidebar nav with 3 focused views (Library, Map, Search) via client-side view switching
- Color palette: pure black surface scale (#000/#0a0a0a/#111/#1a1a1a), white/gray text hierarchy, accent #d4d4d4
- Supported audio formats: mp3, wav, aiff, flac, m4a, aac, ogg, opus
