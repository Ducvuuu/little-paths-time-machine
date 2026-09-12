import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const timelinePath = process.argv[2];
if (!timelinePath) {
  console.error('Usage: node scripts/validate-timeline.mjs <Timeline.json>');
  process.exit(2);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = path.join(projectRoot, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const parserStart = html.indexOf('    function parseCoordinate');
const parserEnd = html.indexOf('    function clampDate', parserStart);

if (parserStart < 0 || parserEnd < 0) {
  console.error('Could not locate the embedded Timeline parser in index.html.');
  process.exit(2);
}

const context = vm.createContext({
  MAP_MAX_POINTS: 6000,
  MAP_TRAIL_FRACTION: 0.18,
  MAP_TRAIL_BANDS: 24,
  Date,
  Math,
  Number,
  String,
  Set,
  Map,
  Array,
  JSON,
  console,
});
vm.runInContext(html.slice(parserStart, parserEnd), context, { filename: 'index.html#timeline-parser' });

const bytes = fs.statSync(timelinePath).size;
const readStarted = performance.now();
const text = fs.readFileSync(timelinePath, 'utf8');
const readMs = performance.now() - readStarted;
const parseStarted = performance.now();
const data = JSON.parse(text);
const parseMs = performance.now() - parseStarted;
const semanticSegments = Array.isArray(data) ? data : data?.semanticSegments;

if (!Array.isArray(semanticSegments)) {
  console.error('Unsupported Timeline shape: expected an array or { semanticSegments: [] }.');
  process.exit(1);
}

const indexStarted = performance.now();
const dateIndex = context.buildTimelineDateIndex(data);
const indexMs = performance.now() - indexStarted;
const sortedDates = [...dateIndex].sort();

if (!sortedDates.length) {
  console.error('No dated Timeline entries were found.');
  process.exit(1);
}

const pathCounts = new Map();
for (const segment of semanticSegments) {
  for (const item of segment?.timelinePath ?? []) {
    const time = new Date(item?.time).getTime();
    if (!Number.isFinite(time)) continue;
    const key = context.mapDayKey(time);
    pathCounts.set(key, (pathCounts.get(key) ?? 0) + 1);
  }
}

const representativeDates = new Set();
const evenlySpacedSamples = Math.min(32, sortedDates.length);
for (let index = 0; index < evenlySpacedSamples; index += 1) {
  const position = Math.round(index / Math.max(1, evenlySpacedSamples - 1) * (sortedDates.length - 1));
  representativeDates.add(sortedDates[position]);
}

for (const [date] of [...pathCounts.entries()].sort((first, second) => second[1] - first[1]).slice(0, 8)) {
  representativeDates.add(date);
}

const errors = [];
const samples = [];
for (const date of representativeDates) {
  const started = performance.now();
  const story = context.buildDayStory(data, date);
  const durationMs = performance.now() - started;
  const coordinatesAreValid = story.route.every((point) => {
    return Array.isArray(point.coord)
      && point.coord.length === 2
      && Number.isFinite(point.coord[0])
      && Number.isFinite(point.coord[1])
      && point.coord[0] >= -180
      && point.coord[0] <= 180
      && point.coord[1] >= -90
      && point.coord[1] <= 90;
  });
  const timesAreFinite = story.route.every((point) => Number.isFinite(point.time));
  const timesAreMonotonic = story.route.every((point, index) => index === 0 || story.route[index - 1].time <= point.time);
  const placesAreValid = story.places.every((place) => Array.isArray(place.coord)
    && place.coord.length === 2
    && place.coord.every(Number.isFinite));
  const withinLimit = story.route.length <= context.MAP_MAX_POINTS;
  const distanceIsValid = Number.isFinite(story.distanceKm) && story.distanceKm >= 0;

  if (!coordinatesAreValid) errors.push('A representative route contained an invalid coordinate.');
  if (!timesAreFinite) errors.push('A representative route contained an invalid timestamp.');
  if (!timesAreMonotonic) errors.push('A representative route was not ordered chronologically.');
  if (!placesAreValid) errors.push('A representative day contained an invalid place coordinate.');
  if (!withinLimit) errors.push('A representative route exceeded the configured point limit.');
  if (!distanceIsValid) errors.push('A representative day produced an invalid distance.');

  samples.push({
    routePoints: story.route.length,
    segments: story.segments.length,
    places: story.places.length,
    durationMs: Math.round(durationMs),
  });
}

const blankStory = context.buildDayStory(data, '2000-01-01');
if (blankStory.route.length || blankStory.places.length) errors.push('The empty-date check unexpectedly returned archive content.');

const result = {
  ok: errors.length === 0,
  fileMegabytes: Number((bytes / 1024 / 1024).toFixed(1)),
  semanticSegments: semanticSegments.length,
  indexedDays: sortedDates.length,
  pathBearingDays: pathCounts.size,
  readMs: Math.round(readMs),
  jsonParseMs: Math.round(parseMs),
  dateIndexMs: Math.round(indexMs),
  representativeDaysTested: samples.length,
  representativeDaysWithRoutes: samples.filter((sample) => sample.routePoints > 0).length,
  maximumRoutePointsTested: Math.max(...samples.map((sample) => sample.routePoints)),
  maximumStopsTested: Math.max(...samples.map((sample) => sample.places)),
  slowestDayBuildMs: Math.max(...samples.map((sample) => sample.durationMs)),
  emptyDateIsEmpty: blankStory.route.length === 0 && blankStory.places.length === 0,
  errors: [...new Set(errors)],
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
