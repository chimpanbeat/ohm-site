// KML -> src/data/zones.geojson (ARCHITECTURE §B5). No dependencies.
// Usage: node scripts/kml-to-geojson.mjs [kmlPath] [--out path]
// Emits only { type, properties: { zone }, geometry }. Descriptions, ExtendedData,
// styles, Points and LineStrings are ignored and never written (the repo is public).
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
let kmlPath = 'brief/Ohm Service Map.kml';
let outPath = 'src/data/zones.geojson';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outPath = args[++i];
  else kmlPath = args[i];
}

const ORDER = ['home', 'shared', 'north'];
const kml = readFileSync(kmlPath, 'utf8');

const count = (re, s) => (s.match(re) ?? []).length;
const skipped = {
  description: count(/<description\b/g, kml),
  extendedData: count(/<ExtendedData\b/g, kml),
  point: count(/<Point\b/g, kml),
  lineString: count(/<LineString\b/g, kml),
};

const decode = (s) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();

/** "lng,lat[,alt]" triples separated by whitespace -> [lng, lat] rounded to 6 places. */
function parseRing(text) {
  const round = (n) => Math.round(n * 1e6) / 1e6;
  return text
    .trim()
    .split(/\s+/)
    .map((triple) => {
      const [lng, lat] = triple.split(',').map(Number);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        console.error(`kml-to-geojson: bad coordinate "${triple}"`);
        process.exit(1);
      }
      return [round(lng), round(lat)];
    });
}

const ringsOf = (polygon) => {
  const grab = (tag) =>
    [...polygon.matchAll(new RegExp(`<${tag}>[\\s\\S]*?<coordinates>([\\s\\S]*?)</coordinates>`, 'g'))].map((m) =>
      parseRing(m[1]),
    );
  return [...grab('outerBoundaryIs'), ...grab('innerBoundaryIs')];
};

const placemarks = [...kml.matchAll(/<Placemark\b[\s\S]*?<\/Placemark>/g)].map((m) => m[0]);
const byZone = new Map();
const unknown = [];

for (const pm of placemarks) {
  const name = decode(pm.match(/<name>([\s\S]*?)<\/name>/)?.[1] ?? '');
  const zone = ORDER.find((z) => name.toLowerCase().startsWith(z));
  if (!zone) {
    unknown.push(name || '(unnamed)');
    continue;
  }
  if (byZone.has(zone)) {
    console.error(`kml-to-geojson: zone "${zone}" appears more than once`);
    process.exit(1);
  }
  const polygons = [...pm.matchAll(/<Polygon\b[\s\S]*?<\/Polygon>/g)].map((m) => ringsOf(m[0]));
  if (polygons.length === 0) {
    console.error(`kml-to-geojson: placemark "${name}" has no polygon`);
    process.exit(1);
  }
  byZone.set(zone, polygons);
}

if (unknown.length) {
  console.error(`kml-to-geojson: unrecognised placemark names: ${unknown.join(', ')}`);
  console.error(`Found: ${placemarks.length} placemark(s). Expected names starting with ${ORDER.join(', ')}.`);
  process.exit(1);
}
const missing = ORDER.filter((z) => !byZone.has(z));
if (missing.length) {
  console.error(`kml-to-geojson: missing zone(s): ${missing.join(', ')}`);
  process.exit(1);
}

const features = ORDER.map((zone) => {
  const polygons = byZone.get(zone);
  const geometry =
    polygons.length === 1
      ? { type: 'Polygon', coordinates: polygons[0] }
      : { type: 'MultiPolygon', coordinates: polygons };
  return { type: 'Feature', properties: { zone }, geometry };
});

writeFileSync(outPath, JSON.stringify({ type: 'FeatureCollection', features }, null, 2) + '\n');

console.log(`Wrote ${features.length} zones to ${outPath}: ${ORDER.join(', ')}`);
console.log(
  `Skipped (never emitted): ${skipped.description} description, ${skipped.extendedData} ExtendedData, ` +
    `${skipped.point} Point, ${skipped.lineString} LineString`,
);
