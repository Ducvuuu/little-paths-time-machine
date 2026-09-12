# Memory Box

## What it is

One application on the home screen owns every import. Messenger, Instagram, and Maps do no importing of their own — they receive the selected date and read from whatever the Memory Box has connected.

The alternative, an import control inside each application, was rejected. One folder holds every source, so per-application importing would mean choosing the same folder several times, building four import screens, and leaving no single place to see whether anything is actually loaded. It would also put a file picker inside interfaces meant to feel like Messenger and Instagram rather than like settings.

## What the owner does

1. Open the Memory Box and choose the archive folder.
2. That is all. The folder is remembered; later visits reconnect without a prompt.

The application lists what the folder holds — messages, chats, and date range per source — so a bad or half-built archive is visible immediately rather than appearing as an empty day.

Each source reports its own state. A folder holding only a Timeline file is a valid archive; the other two simply read as not found.

## What it looks for

| Source | Path |
|---|---|
| Messenger, Instagram | `archive/index.json`, else `index.json`, else the export zips |
| Maps | the first `Timeline*.json` in the folder root or one level below |

A prebuilt archive wins when one is present, because the work is already done. Otherwise the Memory Box reads the export zips where they sit.

## Reading zips without unpacking them

Facebook **stores** rather than compresses these exports — in the export checked, every entry across all eight parts used method 0. An entry is therefore a byte range, and reading a photo out of a 2.8 GB zip is a slice, not a decompression. The eight parts are read as one folder.

That removes the merge step and the trap that came with it: a large share of threads have their media spread across several parts, and the combined entry index makes "which part holds this photo" a lookup rather than something the owner has to get right when unpacking.

Building runs in a worker so the phone stays responsive, and the result is kept in IndexedDB keyed by the zip filenames and sizes — so it is built once and reread instantly, and rebuilt only when the zips actually change. Days are handed back in batches of 150 and written as they arrive; posting a million messages in one message would hold the archive twice while the copy was made. The index is written last, so an interrupted build is rebuilt rather than read back half-finished.

Compressed entries are handled through the browser's own inflate, but this export does not use them. If a future export is compressed and the browser lacks `DecompressionStream`, the Memory Box says so rather than failing quietly.

Message media is resolved relative to the archive index, or straight out of the zips, which is why nothing is ever copied.

## Two ways in

Browsers only let a *served* page retain a directory choice, so the Memory Box carries two backends behind one contract — `getFile(path)` and `findTimeline()`. Nothing else in the interface knows which is in use.

**Served** (`start-little-paths.cmd`, then `http://localhost:8731/`): the File System Access API supplies a directory handle, stored in IndexedDB. The folder is chosen once. On return the handle's permission is queried silently; if the browser has downgraded it to `prompt`, the Memory Box says so and offers to reconnect rather than failing quietly. Zip entries are read through the handle on demand, so an archive of any size is never held in memory.

**Opened from disk** (`index.html` by double-click): `showDirectoryPicker` does not exist, so a `webkitdirectory` input is used instead. Everything works, but the folder must be chosen again after each reload.

Only the handle is persisted — never archive contents. Nothing is uploaded, copied, or written back into the folder.

## Effect on Windback

Before a folder is connected the calendar keeps its illustrative markers, so the phone does not read as broken. Once connected it stops inventing memories and marks only what the archive holds. Photos has no importer, so it contributes no marker.

## Measured behaviour

Measured against one real archive of roughly a million messages and about a decade of location history:

- Connecting a **prebuilt** archive — discovery, parsing, adoption, including a 28 MB Timeline file — takes about **0.4 seconds**. The index stays resident; days are read only when opened.
- Building from a **zip** instead: a 200 MB export's central directory parses in **2 ms**, and the whole export is parsed, stored, and adopted in well under a second. Counts match the Node normalizer exactly.
- **Reconnecting** afterwards takes under half a second and rebuilds nothing.

A multi-gigabyte Messenger set has not been built in the browser; only the Node path has processed one. The zip reading, worker, batching, and storage are the same code either way, but the time and memory that build takes are unmeasured.

## Not built yet

- Photos has no importer.
- A browser build of a multi-gigabyte Messenger set is unverified.
- Day files are cached for the session but not between visits.
- Reactions, replies, calls, and share cards are not extracted, so they do not appear in a conversation.
