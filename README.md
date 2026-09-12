# Little Paths Time Machine

Little Paths Time Machine is a private, local-first personal archive presented as a softly animated phone home screen. Choose a date, then open familiar apps to revisit that day through conversations, places, and photos.

This repository currently contains a visual and interaction prototype. It does not yet import or display real archive data.

## View the prototype

Open `index.html` in a modern browser. No build step or local server is currently required.

The prominent Windback card opens an illustrated calendar. The user can browse months, jump directly to a year, choose an exact date, and preview which apps will contain memories through colored day markers. The other app icons open illustrated placeholder views. Messenger and Instagram use recognizable brand silhouettes, while the surrounding icon family uses original generated illustration.

## Project documentation

- [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md): product vision, intended experience, technical direction, current status, milestones, and open decisions
- [`docs/reference/home-screen-reference.jpg`](docs/reference/home-screen-reference.jpg): the original composition reference supplied for the home-screen exploration

## Current structure

```text
little-paths-time-machine/
├── assets/
│   └── little-paths-icon-atlas.png
├── docs/
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

Project brief and status last updated: 2026-09-12.
