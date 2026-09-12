# Little Paths Time Machine

Little Paths Time Machine is a private, local-first personal archive presented as a softly animated phone home screen. Choose a date, then open familiar apps to revisit that day through conversations, places, and photos.

This repository contains a visual and interaction prototype. Location history, Messenger, and Instagram are imported from real local exports through the Memory Box, and Maps, Messenger, and Instagram all draw on that data. Photos and music remain illustrative.

## Run the prototype

Double-click `start-little-paths.cmd` and leave the window open, then use the phone at <http://localhost:8731/>. There is no build step; the script only serves the folder.

Serving matters: a browser will only let a *served* page hold on to a chosen folder between visits. Opened straight from disk, `index.html` still works, but the Memory Box falls back to a plain folder picker that must be used again after every reload.

The prominent Windback card opens an illustrated calendar. The user can browse months, jump directly to a year, choose an exact date, and preview which apps will contain memories through colored day markers. The lower home-screen widget is an illustrated Spotify player with working track and playback controls. Messenger and Instagram use recognizable brand silhouettes, while the surrounding icon family uses original generated illustration.

Maps, Messenger, and Instagram now have distinct responsive interfaces. On a desktop-sized window, selecting one keeps the phone visible and opens the application beside it. On a narrow screen, the selected application occupies the phone display.

Messenger and Instagram show the conversations that were active on the chosen day, in order, with the photographs and videos that were sent in them. Each keeps its own character: Messenger's blue, Instagram's purple and its serif wordmark.

The Memory Box owns every import. Connect one folder there and the phone finds what it holds: the export zips exactly as they downloaded, or an archive already built from them, plus the Google Timeline file and all the media they reference. Nothing is unpacked or copied — these exports store their contents rather than compressing them, so the zips are read where they sit. The folder is remembered between visits, so the connection is made once rather than each time the page opens.

Maps then renders the selected day's route, stops, travelled distance, and an animated fading playhead. Windback's coloured day markers stop being illustrative for any source the folder actually contains.

## Project documentation

- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md): product vision, intended experience, technical direction, current status, milestones, and open decisions
- [`docs/MEMORY_BOX.md`](docs/MEMORY_BOX.md): how importing works, what the Memory Box looks for, and the two folder-access backends
- [`docs/MAPS_INTEGRATION.md`](docs/MAPS_INTEGRATION.md): implemented Maps scope, supported import, interaction model, and known limitations
- [`docs/MESSAGE_ARCHIVE.md`](docs/MESSAGE_ARCHIVE.md): Messenger and Instagram export format, the multipart merge requirement, and the normalizer
- [`docs/reference/`](docs/reference/): what the original composition reference contributed, and why the image itself is not included

## Current structure

```text
little-paths-time-machine/
├── assets/
│   ├── little-paths-icon-atlas.png
│   └── windback-icon.png
├── docs/
│   ├── MAPS_INTEGRATION.md
│   ├── MEMORY_BOX.md
│   ├── MESSAGE_ARCHIVE.md
│   ├── PROJECT_BRIEF.md
│   └── reference/
│       └── README.md
├── scripts/
│   ├── normalize-messages.mjs
│   └── validate-timeline.mjs
├── .gitignore
├── index.html
├── README.md
└── start-little-paths.cmd
```

## Privacy

Raw exports, normalized personal data, photos, and private messages must not be committed. The planned product processes them locally and stores browser-side indexes on the owner's device.

## Status

Memory Box, message archive, and Maps integration last updated: 2026-09-12.

Messenger, Instagram, and Maps import through the Memory Box and all three read real archive data. Photos has no importer yet and remains illustrative.
