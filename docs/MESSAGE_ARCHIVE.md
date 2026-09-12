# Message archive

## What this covers

Facebook Messenger and Instagram direct messages are normalized once, on the owner's machine, into a day-indexed archive the interface can read one day at a time. Raw exports are never committed and never leave the device.

## Export format

Both exports arrived in **HTML**, not JSON. The brief's original §8 parser notes assume `message_N.json` with `timestamp_ms`; that format was not what Facebook produced here.

HTML turned out to be the better input:

- Text is already correct UTF-8. The mojibake repair step the JSON path requires is unnecessary.
- Timestamps are already rendered in the owner's local time, so no timezone conversion is applied and none can go wrong.
- Structure is consistent across 11 years of conversation history.

The cost is that message markup uses Facebook's generated class names. The parser matches on tokens rather than whole class attributes, because Messenger and Instagram spell the surrounding classes differently:

| Meaning | Token | Messenger | Instagram |
|---|---|---|---|
| One message | `_a6-g` | on `<section>` | on `<div>` |
| Sender | `_a6-h` `_a6-i` | `<h2>` | `<h2>` |
| Content | `_a6-p` | — | — |
| Timestamp | `_a6-o` | nested in `_a72d` | direct text |

If a future export changes these tokens, the parser stops finding messages and reports zero rather than failing silently. Existing extracted archives are unaffected.

## Merging the export parts

Facebook splits one export by size, not by meaning. This export arrived as seven ZIP files:

- 560 thread folders in total, all listed in one part
- 125 of the 290 threads that contain media have that media spread across other parts
- 13 threads have attachments in all seven parts
- no filename appears in more than one part

**If the parts are extracted, they must go into one shared directory.** Extracting them separately loses attachments on 125 threads with no error. Because there are no duplicate paths, extracting into one directory overwrites nothing. Verify a merge by comparing the extracted file count against the combined ZIP listings.

Extracting is now optional. Every entry in these exports is **stored, not compressed**, so the Memory Box reads the parts in place as one folder and the merge step — and its failure mode — disappears. The normalizer below remains the faster path for a full reprocess and works on an extracted tree.

## Running the normalizer

Optional: the interface can build the same archive from the zips itself. Use this when reprocessing a large export repeatedly, or as a fallback if the browser build proves too slow.

```bash
node scripts/normalize-messages.mjs \
  --facebook  "<merged export root>" \
  --instagram "<instagram export root>" \
  --out       "<archive directory>"
```

The script reads only; it never writes into an export.

## Output

```text
archive/
├── index.json
└── days/
    └── YYYY-MM-DD.json
```

`index.json` holds every date, the thread registry, and per-source counts. It is small enough to keep resident.

Each day file holds that day's conversations with their messages in chronological order. Media is referenced by path relative to its export root and never copied, so the archive stays small while pointing at the real files.

```json
{
  "date": "2026-01-09",
  "conversations": [
    {
      "source": "messenger",
      "thread": "<folder id>",
      "title": "<conversation title>",
      "messages": [
        { "time": "23:16:22", "from": "<sender>", "text": "…" },
        { "time": "23:18:04", "from": "<sender>", "media": [{ "kind": "photo", "path": "…/photos/<file>.jpg" }] }
      ]
    }
  ]
}
```

Message times are local wall-clock strings with no timezone, matching how the export rendered them.

## Measured result

| | Messenger | Instagram |
|---|---|---|
| Threads | 560 | 86 |
| Messages | 1,270,480 | 20,719 |
| Attachments | 77,489 | 950 |

Combined: 1,291,199 messages across 3,864 days, 2015-09-10 to 2026-09-07. Conversion takes about 22 seconds. The archive is 126 MB — a 630 KB index plus day files averaging 31 KB.

Verified after conversion: every attachment path resolves to a file on disk, no conversation is out of chronological order, and 29 messages of 1.29 million lack an identifiable sender.

## Skipped blocks

The normalizer skips message blocks carrying neither text nor media: 20,006 in Messenger, 84 in Instagram. Sampling confirms these are empty nested `<div>` shells in the export itself. No text or attachment is discarded.

## Reading a day back

The interface never opens the export. It reads `index.json` once, then one `days/<date>.json` when a day is opened, and resolves each media path against the export folder recorded as `mediaDir`. A day file is a few tens of kilobytes, so opening a date costs one small read rather than a scan.

Messages carry a sender name, not a role. The normalizer records an `owner` per source — the person present in more conversations than anyone else, 434 of 560 threads in Messenger and 81 of 86 in Instagram — and the interface uses that to decide which side of the conversation a message belongs on. The two accounts have different display names, so the owner is recorded per source rather than once.

Where a thread has more than one other participant, senders are named above their messages; in a conversation between two people the bubbles carry that on their own.

## Known limitations

- Reactions, replies, calls, polls, and share cards are not yet extracted.
- Owner detection is statistical. An archive whose owner is absent from most threads would mis-assign message sides.
- Group threads are stored like any other thread; no participant modelling exists.
- Duplicate export folders for the same person are kept separate, as the brief's open question is still undecided.
- The archive is regenerated wholesale; there is no incremental update for a newer export.
- Thumbnails are not generated. A day with many photos loads full-size images.

## Privacy

The normalizer runs locally and writes only to the chosen output directory. Exports, the merged directory, and the generated archive must all stay outside version control; `.gitignore` already excludes `*.zip`, `data/`, `exports/`, `normalized/`, and `private/`.
