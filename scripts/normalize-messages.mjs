// Normalize Facebook Messenger and Instagram HTML exports into a day-indexed archive.
//
//   node scripts/normalize-messages.mjs \
//     --facebook  "C:\path\to\facebook-merged" \
//     --instagram "C:\path\to\instagram-merged" \
//     --out       "C:\path\to\archive"
//
// Reads only; never writes into the export. Output is a small index plus one
// file per calendar day, so the interface can load a single day on demand
// instead of reparsing gigabytes. Media is referenced by path, never copied.
//
// Both exports use Facebook's obfuscated class names. The stable tokens are
// _a6-g (one message), _a6-h/_a6-i (sender), _a6-p (content), _a6-o (time).
// Messenger wraps a message in <section>, Instagram in <div>, and Messenger
// nests the time string one level deeper, so matching is token-based.

import fs from 'node:fs';
import path from 'node:path';

const BLOCK = /<(?:div|section)[^>]*class="[^"]*\b_a6-g\b/;
const SENDER = /class="[^"]*\b_a6-h\b[^"]*\b_a6-i\b[^"]*"[^>]*>([\s\S]*?)<\/(?:h2|div)>/;
const TIME = /class="[^"]*\b_a6-o\b[^"]*"[^>]*>([\s\S]*?)<\/div>/;
const CONTENT = /class="[^"]*\b_a6-p\b[^"]*"[^>]*>([\s\S]*?)(?:<(?:footer|div class="[^"]*\b_a6-o\b)|$)/;
const MEDIA = /<(img|video|audio)\b[^>]*?src="([^"]+)"|<a\b[^>]*?href="([^"]+)"[^>]*>(?![\s\S]{0,40}<img)/g;
const TITLE = /<title>([\s\S]*?)<\/title>/;

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
// "Apr 20, 2020 3:27:34 pm" (Messenger) and "Jul 17, 2026 11:53 pm" (Instagram)
const STAMP = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([ap])m$/i;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

const MEDIA_KIND = {
  jpg: 'photo', jpeg: 'photo', png: 'photo', webp: 'photo', heic: 'photo',
  gif: 'gif', mp4: 'video', mov: 'video', webm: 'video',
  aac: 'audio', ogg: 'audio', mp3: 'audio', m4a: 'audio', wav: 'audio',
};

const FLUSH_AT = 20000; // buffered messages before spilling to disk

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    const key = body.toLowerCase();
    if (ENTITIES[key] !== undefined) return ENTITIES[key];
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10));
    return whole;
  });
}

function textOf(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|p|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseStamp(raw) {
  const match = STAMP.exec(textOf(raw).replace(/\s+/g, ' ').trim());
  if (!match) return null;
  const [, mon, day, year, hourRaw, minute, second, half] = match;
  const month = MONTHS[mon[0].toUpperCase() + mon.slice(1, 3).toLowerCase()];
  if (!month) return null;
  let hour = Number(hourRaw) % 12;
  if (half.toLowerCase() === 'p') hour += 12;
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  const date = `${year}-${pad(month)}-${pad(Number(day))}`;
  return { date, time: `${pad(hour)}:${pad(minute)}:${pad(second ?? 0)}` };
}

function mediaKind(uri) {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return MEDIA_KIND[ext] ?? 'file';
}

function walk(dir, hit) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, hit);
    else hit(full, entry.name);
  }
}

function splitBlocks(html) {
  const parts = [];
  let cursor = 0;
  for (;;) {
    const rest = html.slice(cursor);
    const at = rest.search(BLOCK);
    if (at === -1) break;
    const start = cursor + at;
    const next = html.slice(start + 8).search(BLOCK);
    const end = next === -1 ? html.length : start + 8 + next;
    parts.push(html.slice(start, end));
    if (next === -1) break;
    cursor = end;
  }
  return parts;
}

class DayWriter {
  constructor(root) {
    this.root = path.join(root, 'days');
    fs.mkdirSync(this.root, { recursive: true });
    this.buffers = new Map();
    this.pending = 0;
    this.days = new Set();
  }

  add(date, record) {
    let lines = this.buffers.get(date);
    if (!lines) this.buffers.set(date, (lines = []));
    lines.push(JSON.stringify(record));
    this.days.add(date);
    if (++this.pending >= FLUSH_AT) this.flush();
  }

  flush() {
    for (const [date, lines] of this.buffers) {
      if (lines.length) fs.appendFileSync(path.join(this.root, `${date}.ndjson`), lines.join('\n') + '\n');
    }
    this.buffers.clear();
    this.pending = 0;
  }
}

function parseThread(dir, files, source, threadId, writer, tally) {
  let title = threadId;
  let lastSender = null;
  let count = 0;
  let media = 0;
  let skipped = 0;
  const senders = new Set();

  // message_1.html holds the newest page; order is restored by timestamp later.
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    if (title === threadId) {
      const found = TITLE.exec(html);
      if (found) title = textOf(found[1]).replace(/^(?:Your messages with|Conversation with)\s*/i, '').trim() || threadId;
    }

    for (const block of splitBlocks(html)) {
      const stampRaw = TIME.exec(block);
      const stamp = stampRaw ? parseStamp(stampRaw[1]) : null;
      if (!stamp) {
        skipped += 1;
        continue;
      }

      const senderRaw = SENDER.exec(block);
      // Facebook omits the name on runs of messages from the same person.
      if (senderRaw) lastSender = textOf(senderRaw[1]) || lastSender;
      const from = lastSender ?? 'Unknown';
      senders.add(from);

      const contentRaw = CONTENT.exec(block);
      const body = contentRaw ? contentRaw[1] : '';

      const attachments = [];
      MEDIA.lastIndex = 0;
      let hit;
      while ((hit = MEDIA.exec(body)) !== null) {
        const uri = hit[2] ?? hit[3];
        if (!uri || /^(?:https?:|#|mailto:|data:)/i.test(uri)) continue;
        attachments.push({ kind: mediaKind(uri), path: decodeEntities(uri) });
      }

      const text = textOf(body.replace(/<(?:img|video|audio)\b[^>]*>/gi, ''));
      if (!text && !attachments.length) {
        skipped += 1;
        continue;
      }

      const record = { source, thread: threadId, time: stamp.time, from };
      if (text) record.text = text;
      if (attachments.length) record.media = attachments;
      writer.add(stamp.date, record);

      count += 1;
      media += attachments.length;
    }
  }

  for (const sender of senders) {
    if (!tally.senderThreads.has(sender)) tally.senderThreads.set(sender, 0);
    tally.senderThreads.set(sender, tally.senderThreads.get(sender) + 1);
  }

  tally.threads[threadId] = { title, source, folder: path.relative(tally.root, dir).split(path.sep).join('/'), messages: count };
  tally.messages += count;
  tally.media += media;
  tally.skipped += skipped;
}

// Exports title a conversation "Participants: A and B", the owner included.
// Naming a thread after the other people in it is what the inbox wants.
function tidyTitle(title, owner) {
  const listed = /^Participants:\s*(.+)$/i.exec(title);
  if (!listed) return title;
  const others = listed[1]
    .split(/,\s*|\s+and\s+/i)
    .map((name) => name.trim())
    .filter((name) => name && name !== owner);
  if (!others.length) return owner ? `${owner} (just you)` : title;
  if (others.length <= 2) return others.join(' and ');
  return `${others[0]} and ${others.length - 1} others`;
}

function collectThreads(root) {
  const byDir = new Map();
  walk(root, (full, name) => {
    if (!/^message_\d+\.html$/i.test(name)) return;
    const dir = path.dirname(full);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(full);
  });
  return byDir;
}

function ingest(root, source, writer, summary) {
  if (!root) return;
  if (!fs.existsSync(root)) throw new Error(`${source}: export root not found: ${root}`);

  const threads = collectThreads(root);
  if (!threads.size) throw new Error(`${source}: no message_*.html found under ${root}`);

  const tally = { root, threads: {}, messages: 0, media: 0, skipped: 0, senderThreads: new Map() };
  let done = 0;
  for (const [dir, files] of threads) {
    parseThread(dir, files.sort(), source, path.basename(dir), writer, tally);
    if (++done % 50 === 0) process.stderr.write(`  ${source}: ${done}/${threads.size} threads\r`);
  }
  writer.flush();
  process.stderr.write(`  ${source}: ${threads.size} threads, ${tally.messages.toLocaleString()} messages\n`);

  let owner = null;
  let ownerThreads = 0;
  for (const [sender, seen] of tally.senderThreads) {
    if (seen > ownerThreads) {
      owner = sender;
      ownerThreads = seen;
    }
  }

  for (const thread of Object.values(tally.threads)) {
    thread.title = tidyTitle(thread.title, owner);
  }

  summary.sources[source] = {
    root,
    mediaDir: path.basename(root),
    owner,
    ownerThreads,
    threads: threads.size,
    messages: tally.messages,
    attachments: tally.media,
    skippedBlocks: tally.skipped,
  };
  Object.assign(summary.threads, tally.threads);
}

function compileDays(out, writer, summary) {
  const dir = writer.root;
  const days = {};
  for (const date of [...writer.days].sort()) {
    const file = path.join(dir, `${date}.ndjson`);
    if (!fs.existsSync(file)) continue;

    const records = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

    const conversations = new Map();
    const counts = {};
    for (const record of records) {
      const key = `${record.source}:${record.thread}`;
      if (!conversations.has(key)) {
        conversations.set(key, { source: record.source, thread: record.thread, title: summary.threads[record.thread]?.title ?? record.thread, messages: [] });
      }
      const { source, thread, ...message } = record;
      conversations.get(key).messages.push(message);

      const bucket = (counts[source] ??= { threads: 0, messages: 0, media: 0 });
      bucket.messages += 1;
      bucket.media += record.media?.length ?? 0;
    }
    for (const conversation of conversations.values()) {
      counts[conversation.source].threads += 1;
    }

    fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify({ date, conversations: [...conversations.values()] }));
    fs.unlinkSync(file);
    days[date] = counts;
  }

  fs.writeFileSync(
    path.join(out, 'index.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), sources: summary.sources, threads: summary.threads, days }, null, 2)
  );
  return days;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    args[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const out = args.out;
  if (!out || (!args.facebook && !args.instagram)) {
    console.error('usage: node scripts/normalize-messages.mjs [--facebook DIR] [--instagram DIR] --out DIR');
    process.exit(2);
  }

  fs.mkdirSync(out, { recursive: true });
  const writer = new DayWriter(out);
  const summary = { sources: {}, threads: {} };
  const started = Date.now();

  ingest(args.facebook, 'messenger', writer, summary);
  ingest(args.instagram, 'instagram', writer, summary);

  const days = compileDays(out, writer, summary);
  const dates = Object.keys(days).sort();

  console.log(
    JSON.stringify(
      {
        ok: true,
        out,
        days: dates.length,
        earliest: dates[0] ?? null,
        latest: dates[dates.length - 1] ?? null,
        sources: summary.sources,
        seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
      },
      null,
      2
    )
  );
}

main();
