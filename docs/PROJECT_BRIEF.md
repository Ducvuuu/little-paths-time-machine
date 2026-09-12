# Project brief: Little Paths Time Machine

**Status date:** 2026-09-12<br>
**Repository stage:** interactive local-first prototype<br>
**Product stage:** three of the four applications reading a real personal archive

## 1. What this project is

Little Paths Time Machine is a private personal archive that feels like holding a phone from a chosen day in the past.

The user chooses a date on a softly animated home screen. Each app then shows only the material associated with that date:

- **Maps** shows where the user went and animates the route through the day.
- **Facebook Messenger** shows Messenger conversations and inline media from that day.
- **Instagram** shows Instagram direct messages from that day.
- **Photos** shows photographs taken on that day.

The product is deliberately not a merged analytics dashboard. Maps, Messenger, Instagram, and Photos remain separate experiences. The user forms the story of the day by moving between them, as they would on a real phone.

The emotional goal is remembrance rather than measurement. Counts, routes, and timestamps support the experience, but they are not the primary subject. The subject is the day itself.

## 2. What the owner intends to build

The intended result is a browser application that:

1. Opens on an illustrated phone home screen.
2. Lets the user set one historical date as the global time-machine dial.
3. Keeps that date synchronized across every app.
4. Loads personal exports locally, without sending private history to a server.
5. Recreates the visual character of each source app closely enough to trigger recognition.
6. Preserves the distinction between Facebook Messenger and Instagram rather than combining them into one inbox.
7. Displays exported images inline with the messages in which they appeared.
8. Makes moving through a past day feel gentle, intimate, and playful.

This is primarily a private personal tool. Sharing or public publishing is not part of the current scope.

## 3. Intended user experience

### Entry

The user sees a dark, quiet phone home screen with a narrow central composition. The interface should feel like 2D graphic art from a gentle animated film, not a conventional website placed inside a phone frame.

The top widget contains the current time-machine date. Choosing another date changes the entire phone.

### Exploration

The first row contains the four meaningful applications:

- Facebook Messenger
- Instagram
- Maps
- Photos

The rest of the grid can contain decorative apps to make the device feel inhabited, but those apps should not compete with the four core destinations.

Opening an app should feel like entering that application on the chosen day. Returning home should preserve the selected date.

### Playback

Maps already has a day-playback idea: the route appears as a fading comet trail with stops and camera framing. A future day-level play control may coordinate a guided sequence, but it must not turn the product into a single combined dashboard.

## 4. Product principles

### Local first

The application should work with files selected from the user's own computer. Private messages, location history, and photos should remain on that device.

### A date is the central organizing object

Every data source must be indexed by the user's local calendar day. UTC bucketing would place some late-night events on the wrong day and break the illusion.

### Each app keeps its identity

Messenger and Instagram must remain separate. Their interfaces should be recognizable and intentionally different.

### Media is part of memory

Messages without their images are incomplete. Inline photos are a requirement rather than an optional enhancement.

### Emotional clarity over feature density

The interface should remain calm. It should not resemble a productivity dashboard, data-management tool, or analytics product.

## 5. Visual direction

The desired visual language is:

- flat 2D illustration
- rounded, playful shapes
- muted coral, sage, sky blue, butter yellow, lavender, cream, and blue-grey
- subtle paper or gouache texture
- slightly imperfect graphic geometry
- gentle ambient movement
- recognizable brand silhouettes for Messenger and Instagram

The design should avoid:

- 3D rendering
- bevels and simulated depth
- glossy gradients
- glassmorphism
- metallic phone treatments
- dramatic shadows
- generic thin-line web icons
- uniform design-system cards that make the result feel like a dashboard

Motion should be quiet and characterful. Appropriate examples include a two-pixel float, a star slowly blinking, an icon gently breathing, or a soft squash when pressed. Motion must respect `prefers-reduced-motion`.

## 6. Data sources and application scope

| Application | Primary source | Intended first scope | Current status |
|---|---|---|---|
| Maps | Google Timeline export | One day, labelled stops, route playback | Working on real data; imported through the Memory Box |
| Facebook Messenger | Facebook data export | Chats and inline photos for one day | Working on real data; 560 threads, 1.27M messages |
| Instagram | Instagram export | Direct messages only | Working on real data; 86 threads, 20,719 messages |
| Photos | Google Photos Takeout | Day-based photo roll | Planned; API approach rejected |

### Google Photos constraint

The product should use Google Takeout rather than the Google Photos API. Changes introduced in 2025 prevent a third-party app from freely listing an existing full library in the way this concept requires. Takeout supplies media files plus JSON sidecars with timestamps and sometimes location data, which fits the local-first model.

## 7. Proposed data architecture

The preferred architecture has no backend.

### Stage A: normalize an export

A local script runs once when a new export is added. It should:

1. Merge all parts of a split export into one logical directory tree.
2. Discover supported source folders.
3. Parse and repair text encoding.
4. Combine chunked conversations.
5. Sort events by timestamp.
6. Resolve relative media paths.
7. Bucket records by local calendar date.
8. Write a stable, source-neutral index for the browser application.

### Stage B: browse the normalized archive

The application loads the normalized index and obtains browser access to the selected media directory. IndexedDB can cache parsed indexes and retained file handles where supported. Blob URLs should reference large media files without copying entire archives into memory.

### Why normalization happens outside the interface

Messenger and photo exports can be many gigabytes. Reparsing them in the browser on every visit would be slow and fragile. A repeatable local normalization step keeps the viewing experience fast while preserving privacy.

## 8. Facebook Messenger import notes

**Superseded in part.** The export Facebook actually produced is HTML, not JSON, and the parser built against it lives in [`MESSAGE_ARCHIVE.md`](MESSAGE_ARCHIVE.md). HTML proved the better input: text arrives as correct UTF-8, so the mojibake repair described below is unnecessary, and timestamps are already in the owner's local time. The notes here remain accurate for a JSON export and are kept for that case.

Facebook can split one export across several ZIP files by size rather than by meaning. A conversation file may be in one part while its media files are in other parts. Parts must therefore be read as one relative directory tree. Because these exports store rather than compress their contents, the application now reads the parts in place instead of requiring them to be extracted and merged first.

Expected areas include:

```text
your_facebook_activity/
└── messages/
    ├── inbox/
    ├── e2ee_cutover/
    ├── archived_threads/
    ├── filtered_threads/
    └── message_requests/
```

Important parser behavior:

- Combine all `message_N.json` files in a conversation.
- Sort messages by `timestamp_ms`; file numbering does not guarantee chronological order.
- Treat media URIs as paths relative to the merged export root.
- Repair the common mojibake problem by interpreting affected strings as Latin-1 bytes and decoding them as UTF-8.
- Apply encoding repair to message text, sender names, and other human-readable fields.
- Decide explicitly whether folders representing the same person should remain separate or be merged.

## 9. Relationship to the existing Little Paths app

An existing deployed application named Little Paths visualizes a Google Timeline export on a softly styled MapLibre map. It supports day and date-range playback, labelled stops, a fading route trail, day-based camera framing, playback-duration presets, and a clean control-free view.

Its focused single-day engine is now integrated into this repository's standalone prototype. Maps consumes the Windback date, opens beside the phone on desktop and inside the phone on smaller screens, and turns actual imported Timeline dates into calendar markers.

This repository now owns the integrated product prototype. The next production step is to migrate the combined shell and focused map engine to typed Next.js components while retaining the original Little Paths repository as the fuller standalone map experiment.

## 10. What exists in this repository now

### `index.html`

A standalone home-screen study containing:

- a flat illustrated phone frame
- a dark starry wallpaper
- a prominent Windback time-machine launcher with its own generated icon
- a calendar-first Windback view with month navigation, year selection, exact-date entry, and memory markers
- a 20-position app grid
- exact recognizable silhouettes for Facebook Messenger and Instagram
- generated illustrated artwork for the remaining app concepts
- subtle idle motion and press feedback
- placeholder app-opening transitions
- a compact illustrated Spotify widget with playback and track controls
- distinct Messenger and Instagram DM interface prototypes with inboxes, conversations, and inline illustrated media
- a Memory Box application that owns every import and remembers the chosen folder between visits
- a zip reader that treats the export parts as one folder without unpacking them
- a background worker that turns those exports into a day-indexed archive and caches it
- single-day Maps rendering with routes, stops, distance, scrubbing, and animated playback
- Messenger and Instagram rendering the real conversations of the selected day, with their photographs and videos
- calendar markers derived from the archive rather than invented
- a desktop companion layout that opens Maps and social apps beside the phone
- a phone layout that lets Maps and social apps take over the device screen
- reduced-motion support

Maps, Messenger, and Instagram all read real archive data. Photos remains unbuilt and is the only application still illustrative.

### `assets/little-paths-icon-atlas.png`

A generated transparent raster atlas containing 20 graphic-art icon concepts. The HTML uses calibrated background positions based on the atlas's actual painted bounds rather than assuming perfectly even generated cells.

The atlas is exploratory. Before production work, replacing it with one file per approved icon would simplify cropping, responsive sizing, animation, and maintenance.

### `docs/reference/home-screen-reference.jpg`

The original screenshot used as a composition reference. Its narrow centered grid, dark wallpaper, widgets, and phone-screen rhythm are useful references. Its dimensional icon treatment is not the desired final art direction.

## 11. Work completed so far

- Defined the fake-phone time-machine concept.
- Rejected the merged map-and-message dashboard approach.
- Chose a local-only privacy model.
- Chose Google Takeout instead of the Google Photos API.
- Outlined a two-stage normalization and browsing architecture.
- Researched Facebook Messenger export structure and common parsing failures.
- Created the first standalone home-screen mock.
- Identified that the first mock felt too much like a web dashboard.
- Changed the visual target to flat 2D graphic illustration.
- Generated an exploratory illustrated icon atlas.
- Preserved exact brand recognition for Messenger and Instagram.
- Corrected atlas crops using measured painted pixel bounds.
- Added a prominent Windback app that replaces the generic header widget and controls the global date.
- Generated a standalone Windback icon so its art does not depend on sprite-atlas cropping.
- Reworked Windback around an illustrated month calendar rather than a timeline scrubber.
- Replaced the lower day-summary card with a recognizable illustrated Spotify player.
- Added distinct Messenger and Instagram direct-message views.
- Added responsive behavior that opens social apps beside the phone on large screens and inside the phone on small screens.
- Integrated the focused single-day Little Paths map engine with responsive desktop and phone presentations.
- Connected real Timeline availability to Windback's Maps calendar markers.
- Added local session-only Timeline import with no archive upload.
- Created this dedicated local Git repository and formal project brief.
- Established that the real exports arrived as HTML, and that HTML is the better input than JSON.
- Confirmed the seven Messenger ZIP parts form one export, with media for 125 threads spread across parts.
- Built a local normalizer producing a day-indexed archive from the HTML exports.
- Built the Memory Box as the single owner of importing, with the folder remembered between visits.
- Established that these exports store rather than compress, so the ZIPs can be read in place.
- Moved archive building into the browser, in a worker, cached in IndexedDB.
- Connected Messenger and Instagram to the archive, including inline photographs and videos.

## 12. What has not been built

- No production application framework has been initialized here; the work remains in the standalone prototype.
- No Google Photos Takeout importer exists.
- No tests exist for timezone bucketing, media paths, or damaged export data.
- Reactions, replies, calls, polls, and share cards are not extracted from conversations.
- A browser build of the full 17 GB Messenger set is unverified; only the Node path has processed it.
- Maps still buckets dates at a fixed UTC+07:00 rather than using the per-segment offsets the Timeline file carries.
- No mobile access or sharing system is planned at this stage.

## 13. Recommended implementation sequence

### Milestone 0: approve the visual shell

Goal: establish the home screen's composition, icon family, typography, and motion before embedding it in application code.

Acceptance criteria:

- Messenger and Instagram are immediately recognizable.
- The screen reads as illustration rather than web design.
- No 3D, glass, metallic, or glossy treatment remains.
- All icons display without atlas bleed or clipping.
- Date selection and app opening feel gentle and intentional.
- The owner approves the visual direction.

### Milestone 1: establish the production application

Goal: decide which repository owns the final product and create the app shell.

Tasks:

- choose between integrating into the existing Little Paths repository or evolving this repository
- establish typed app routing and shared date state
- preserve static-export compatibility if GitHub Pages remains the deployment target
- define the normalized archive schema
- add tests for local-date conversion

### Milestone 2: build the local normalization tool — complete

Goal: turn raw exports into a stable local archive index.

Done twice over: `scripts/normalize-messages.mjs` for a local run, and the same logic in a browser worker so the application can build its own archive from the ZIPs. A fixture archive for automated tests is still missing.

Tasks:

- merge multipart Facebook exports
- discover Messenger thread folders
- concatenate and order chunked messages
- repair mojibake
- resolve media paths
- bucket messages by local day
- produce a small fixture archive for automated tests

### Milestone 3: build Facebook Messenger first — complete

Goal: prove the end-to-end archive model using the export already available to the owner.

Every acceptance criterion below is met.

Acceptance criteria:

- choose a date on the home screen
- open Messenger
- see threads active on that date
- open a thread and see chronologically ordered messages
- display exported photos inline
- handle missing or unsupported media gracefully
- never upload archive content

### Milestone 4: integrate Maps — prototype complete

Goal: bring the existing Little Paths day playback into the same selected-date model.

Acceptance criteria:

- Maps opens directly to the globally selected date
- returning home preserves playback state where reasonable
- route animation and labelled stops remain intact

Implemented in the standalone prototype. Production extraction, worker-based parsing, persistent archive access, and timezone tests remain.

### Milestone 5: add Instagram DMs — complete

Goal: reuse the normalization architecture while preserving a visibly Instagram-specific interface.

Instagram shares the importer and the view code, and keeps its own palette, serif wordmark, and message styling.

### Milestone 6: add Photos Takeout

Goal: show the selected day's photo roll using media timestamps and sidecar metadata, with optional future map placement when geographic data is present.

## 14. Decisions still needed

### Visual

1. Should the decorative apps remain, or should the home screen become calmer with fewer icons? One slot has since become the Memory Box, leaving fifteen decorative.
2. Should every icon be commissioned or generated as an individual asset rather than using an atlas?
3. How closely should widgets follow the reference screenshot versus serving the time-machine concept?
4. Should the day-summary card remain, or should the lower widget become a music player again?

### Messenger scope

1. ~~Is version one limited to `inbox/`?~~ **Resolved:** every thread folder is read, including archived, filtered, requests, and encrypted-cutover.
2. Should duplicated export folders for the same participant be merged? Still open; they are currently kept separate.
3. ~~Are group chats in scope?~~ **Resolved:** yes. Senders are named above their messages in group threads.
4. ~~Photos only?~~ **Resolved:** photos, GIFs, video, audio, and files are all carried. Reactions, replies, and share cards are not.

### Technical ownership

1. Does this repository become the production application?
2. Or does the approved shell move into the existing `Ducvuuu/little-paths` repository?
3. Which local timezone should be recorded as the archive's canonical bucketing zone?

## 15. Risks and mitigations

### Large exports

**Risk:** parsing gigabytes repeatedly can freeze the interface.<br>
**Mitigation:** normalize once, stream where practical, cache indexes, and use file-backed blob URLs.

### Broken media paths

**Risk:** processing Facebook ZIP parts independently silently loses attachments.<br>
**Mitigation:** merge every part into one relative directory tree before parsing.

### Incorrect dates

**Risk:** UTC conversion places late-night messages and photos on adjacent days.<br>
**Mitigation:** make timezone handling explicit and cover boundary times with tests.

### Brand recognition versus original art

**Risk:** generic illustrations make Messenger and Instagram difficult to identify, while untouched stock logos break the illustrated world.<br>
**Mitigation:** preserve accurate brand silhouettes and place them inside the shared flat graphic-art treatment.

### Raster atlas fragility

**Risk:** generated cells vary in painted bounds and can bleed or clip when treated as a uniform sprite sheet.<br>
**Mitigation:** use the measured crop positions in the prototype and migrate approved production icons to individual files.

### Privacy

**Risk:** messages, locations, and photos are unusually sensitive personal data.<br>
**Mitigation:** keep processing local, ignore archive folders in Git, make network behavior auditable, and avoid telemetry that includes archive content.

## 16. Definition of the first meaningful release — reached

The first meaningful release is not the completed four-app phone. It is a private end-to-end Messenger day viewer:

1. The user opens the home screen.
2. The user chooses a date.
3. The user grants access to a locally normalized Facebook export.
4. Messenger opens with the conversations active that day.
5. Messages appear in order with inline photos.
6. Closing and reopening the local app does not require reparsing the full export.
7. No archive content leaves the device.

All seven hold, with one caveat worth keeping in view: step 6 is proven for a prebuilt archive and for the Instagram export read straight from its ZIP, but a full browser build of the 17 GB Messenger set has not yet been run.

That foundation now also carries Instagram DMs and Maps. Photos Takeout is the remaining source.
