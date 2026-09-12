# Maps integration

## Implemented experience

Maps is the first Little Paths Time Machine application connected to real archive data.

1. Choose a day in Windback or open Maps immediately.
2. If no location archive is loaded, select an Android Google Timeline `Timeline.json` from the illustrated empty state.
3. The file is parsed locally in the browser.
4. If the selected date is absent, the Time Machine moves to the newest date found in the import.
5. Maps renders that day's route, stops, travelled distance, and start/end times.
6. The play button animates a fading coral trail and paper-airplane playhead. The bottom timeline also supports scrubbing.
7. Returning home preserves the selected date and imported data for the current session.

On desktop, Maps opens in the companion panel beside the phone. Below 900 pixels, it takes over the phone display. The map observes its container and resizes when the responsive surface changes.

## Included from the original Little Paths map

- Google Timeline semantic-segment and timeline-path parsing
- Activity endpoints and travel-mode detection
- Route thinning for large days
- Visit clustering and inferred-home labels
- Soft OpenFreeMap restyling
- Distinct walking-path treatment
- Automatic route framing
- Fading route animation

## Deliberately omitted

- Date-range playback
- Time-of-day filtering
- Playback-duration presets
- Follow, full-path, and zoom-out settings
- Clean screenshot mode
- Dashboard-style controls and legend

Windback is the only date selector. This keeps Maps feeling like an application living inside the selected day rather than a second time machine.

## Calendar integration

Before a Timeline import, Windback does not invent Maps availability. After import, blue Maps dots are derived from dates found in the actual Timeline file. Messenger, Instagram, and Photos indicators remain illustrative placeholders until their importers exist.

## Privacy and network behavior

The Timeline file is read with the browser File API and stored only in JavaScript memory. It is not uploaded, committed, or written into the project. Reloading the page clears it.

The current prototype loads MapLibre GL from `unpkg.com` and map tiles from OpenFreeMap. These requests do not contain the Timeline JSON, but requesting tiles necessarily reveals the viewed tile coordinates to the tile service. A production migration should bundle MapLibre locally and retain an explicit disclosure for remote map tiles.

## Timezone policy

Date bucketing currently uses UTC+07:00, matching the archive owner's present timezone. The production archive model should record one explicit IANA timezone and cover midnight boundaries with automated tests before supporting archives from multiple home timezones.

## Known limitations

- The standalone prototype still needs migration to typed Next.js components.
- Large Timeline files are parsed on the main thread and may pause the interface.
- The import lasts for one browser session only.
- The current parser targets the recent Android Timeline semantic-segment export format.
- MapLibre and map tiles require an internet connection.
- A selected date can contain Timeline records but no renderable movement route; Maps then shows the no-path state.

## Next production step

Extract the importer, day-story builder, animation calculations, and MapLibre lifecycle into separate TypeScript modules. The public interaction contract should remain small: Maps receives the shared selected date and the shared Timeline archive, while the future Memory Box owns importing and persistence.

## Local validation

Run the privacy-safe validator against a Timeline export before using it in the interface:

```bash
node scripts/validate-timeline.mjs "C:\path\to\Timeline.json"
```

The validator executes the exact parser embedded in `index.html`. It reports aggregate counts and performance only; it does not print dates, coordinates, places, or filenames.
