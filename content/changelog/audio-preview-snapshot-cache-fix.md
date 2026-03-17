---
title: Audio preview snapshot cache fix
category: fix
createdAt: 2026-03-17
---

This fixes a React update loop in the shared audio preview button after switching it to `useSyncExternalStore`. The preview store now caches its snapshot object and only changes the reference when playback state actually changes, which keeps React from treating every read as a fresh update.

The result is that preview playback keeps the external-store setup, but no longer trips the `Maximum update depth exceeded` error.
