# Presenter - Project Summary

## What is this?
A presentation tool with a custom `.deck` format, visual builder, mobile remote control, and real-time audience sync. Built with vanilla HTML/CSS/JS + Supabase Realtime + Reveal.js. Deployed on Vercel.

**Live URL:** https://presenter-taupe.vercel.app
**GitHub:** https://github.com/Mrcolgate2024/presenter

## Architecture
- **Frontend only** (static site on Vercel) - no backend server needed
- **Supabase Realtime Broadcast** for WebSocket-like sync between presenter, remote, and audience
- **Supabase Database** stores presentations (table: `presentations` in SKY project)
- **Reveal.js** renders slides with markdown, code highlighting, animations
- **QR codes** generated client-side for easy mobile connection

## The `.deck` Format
A custom JSON-based presentation format that breaks with industry standards:

| Traditional | .deck |
|---|---|
| Slides (flat pages) | **Scenes** with internal beats |
| Themes (manual CSS) | **Moods** (emotion-driven auto-styling) |
| Manual positioning | **Smart layouts** (declare intent) |
| Linear order | **Scene graph** (named, free-flow) |
| Per-object animation config | **Beats** (time-based reveals) |

### 7 Moods
dramatic, calm, energetic, focused, tense, inspiring, playful

### 6 Layouts
center, split, grid, focus, top, comparison

### 10 Block Types
title, subtitle, heading, text, list, code, metric, quote, image, comparison

### 8 Enter Animations
fade, rise, slide-left, slide-right, zoom, blur, bounce, typewriter

## Views
| View | URL Path | Purpose |
|---|---|---|
| Dashboard | `/` | List presentations, create new, QR codes |
| Builder | `/builder.html` | Visual editor for .deck files |
| Slides | `/slides.html?file=X` | Fullscreen presentation (projector) |
| Remote | `/remote.html` | Mobile remote control |
| Audience | `/audience.html` | Real-time audience follow-along |
| Speaker | `/presenter.html` | Speaker view with notes + timer |

## Tech Stack
- HTML/CSS/JS (vanilla, no framework)
- Supabase (Realtime Broadcast + PostgreSQL)
- Reveal.js 5.1.0 (CDN)
- Vercel (static hosting)
- Inter + JetBrains Mono fonts
- Gen-Z glassmorphism UI design

## Supabase Config
- **Project:** SKY (`zfgnjvsnoymsljrznipu`)
- **Region:** eu-west-1
- **Table:** `public.presentations` (id, name, filename, type, content jsonb, markdown_content text, created_at, updated_at)
- **RLS:** Public read/write (no auth required for presentation tool)
- **Realtime:** Broadcast channel `presenter` for sync

## Key Files
```
public/
  index.html          - Dashboard
  builder.html        - Visual editor
  slides.html         - Slide viewer (Reveal.js)
  remote.html         - Mobile remote
  audience.html       - Audience sync view
  presenter.html      - Speaker view
  css/
    custom.css        - Main styles (glassmorphism theme)
    moods.css         - Mood system + layouts + animations
  js/
    supabase-client.js - Shared Supabase + Realtime setup
    deck-renderer.js   - .deck JSON -> Reveal.js HTML
    builder.js         - Builder editor logic
    slides.js          - Slide view logic
    remote.js          - Remote control logic
    audience.js        - Audience view logic
    presenter.js       - Speaker view logic
```

## Development History
1. Initial build with Node.js + Express + Socket.IO (local server)
2. Created custom `.deck` format with mood-driven scenes
3. Built visual builder with live preview
4. Redesigned UI for Gen-Z aesthetic (glassmorphism, gradients)
5. Refactored to Supabase Realtime (removed server dependency)
6. Deployed to Vercel as static site
