import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Synthetic KML only: the real export is never read here.
const dir = mkdtempSync(join(tmpdir(), 'ohm-zones-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const square = (x: number) =>
  `<Polygon><outerBoundaryIs><LinearRing><coordinates>` +
  `${x},38,0 ${x + 1},38,0 ${x + 1},39,0 ${x},39,0 ${x},38,0` +
  `</coordinates></LinearRing></outerBoundaryIs></Polygon>`;

const polygonPlacemark = (name: string, x: number) =>
  `<Placemark><name>${name}</name>${square(x)}</Placemark>`;

const kmlOf = (...placemarks: string[]) =>
  `<?xml version="1.0"?><kml><Document>${placemarks.join('')}</Document></kml>`;

let n = 0;
function run(kml: string) {
  const id = n++;
  const kmlPath = join(dir, `in-${id}.kml`);
  const outPath = join(dir, `out-${id}.geojson`);
  writeFileSync(kmlPath, kml);
  const r = spawnSync(process.execPath, ['scripts/kml-to-geojson.mjs', kmlPath, '--out', outPath], {
    encoding: 'utf8',
  });
  return { ...r, outPath };
}

test('valid KML: three zones in order, nothing but the zone name emitted', () => {
  const r = run(
    kmlOf(
      polygonPlacemark('<![CDATA[Central & Southwest Springs]]>', -105),
      polygonPlacemark('Mid-north\n  Springs', -104),
      polygonPlacemark('North Springs', -103),
      `<Placemark><name>Home base</name><description>secret note</description>` +
        `<ExtendedData><Data name="k"><value>v</value></Data></ExtendedData>` +
        `<Point><coordinates>-104.5,38.5,0</coordinates></Point></Placemark>`,
    ),
  );
  assert.equal(r.status, 0, r.stderr);
  const raw = readFileSync(r.outPath, 'utf8');
  const out = JSON.parse(raw);
  assert.deepEqual(
    out.features.map((f: { properties: unknown }) => f.properties),
    [{ zone: 'home' }, { zone: 'shared' }, { zone: 'north' }],
  );
  assert.ok(!raw.includes('secret note'));
  assert.ok(!raw.includes('Home base'));
});

test('unknown polygon name stops the script and lists the expected names', () => {
  const r = run(
    kmlOf(
      polygonPlacemark('Central &amp; Southwest Springs', -105),
      polygonPlacemark('Mid-north Springs', -104),
      polygonPlacemark('North Region', -103),
    ),
  );
  assert.equal(r.status, 1);
  assert.match(r.stderr, /North Region/);
  assert.match(r.stderr, /Mid-north Springs/);
});

test('a missing zone stops the script', () => {
  const r = run(
    kmlOf(polygonPlacemark('Central &amp; Southwest Springs', -105), polygonPlacemark('North Springs', -103)),
  );
  assert.equal(r.status, 1);
});
