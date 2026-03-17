---
title: Map exploration and track detail upgrades
category: feature
createdAt: 2026-03-17
---

The demo now treats map exploration and vibe search as separate flows. Clicking a point stays on the map, the search view is prompt-only, and related-track exploration lives directly in the map inspector so you can audition and compare neighbors without getting bounced into another page.

Track ingestion and detail hydration are also much more robust. The app now dedupes exact re-imports with SHA-256 fingerprints, backfills missing BPM and crate notes for older Convex tracks, and shows richer metadata throughout the library, map, and search surfaces.

Performance and usability were tightened up for larger crates too. The library list now uses lightweight row virtualization, long-list rendering was reduced, and recent React cleanup removed unnecessary effects and low-value memoization while keeping the expensive embedding-map work cached where it matters.
