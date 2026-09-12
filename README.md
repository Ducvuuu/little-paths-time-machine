# Little Paths Time Machine

Little Paths Time Machine is a private, local-first personal archive presented as a softly animated phone home screen. Choose a date, then open familiar apps to revisit that day through conversations, places, and photos.

This repository contains a visual and interaction prototype with a first real-data integration for Google Timeline. Messenger, Instagram, Photos, and music still use illustrative placeholder content.

## View the prototype

Open `index.html` in a modern browser. No build step or local server is currently required.

The prominent Windback card opens an illustrated calendar. The user can browse months, jump directly to a year, choose an exact date, and preview which apps will contain memories through colored day markers. The lower home-screen widget is an illustrated Spotify player with working track and playback controls. Messenger and Instagram use recognizable brand silhouettes, while the surrounding icon family uses original generated illustration.

Maps, Messenger, and Instagram now have distinct responsive interfaces. On a desktop-sized window, selecting one keeps the phone visible and opens the application beside it. On a narrow screen, the selected application occupies the phone display.

Maps is the first data-backed application. Open Maps, choose an Android Google Timeline `Timeline.json`, and the application will locally render the selected day's route, stops, travelled distance, and an animated fading playhead. Imported dates replace the prototype's simulated Maps calendar dots. Timeline data is held only for the current browser session and must be selected again after a reload.

## Project documentation

- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md): product vision, intended experience, technical direction, current status, milestones, and open decisions
- [`docs/MAPS_INTEGRATION.md`](docs/MAPS_INTEGRATION.md): implemented Maps scope, supported import, interaction model, and known limitations
- [`docs/reference/home-screen-reference.jpg`](docs/reference/home-screen-reference.jpg): the original composition reference supplied for the home-screen exploration

## Current structure

```text
little-paths-time-machine/
├── assets/
│   ├── little-paths-icon-atlas.png
│   └── windback-icon.png
├── docs/
│   ├── MAPS_INTEGRATION.md
│   ├── PROJECT_BRIEF.md
│   └── reference/
│       └── home-screen-reference.jpg
├── .gitignore
├── index.html
└── README.md
```

## Privacy

Raw exports, normalized personal data, photos, and private messages must not be committed. The planned product processes them locally and stores browser-side indexes on the owner's device.

## Status

Maps integration and project status last updated: 2026-09-12.
