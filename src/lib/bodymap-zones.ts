// Body map zone lookup (B5, ARCHITECTURE §B12 Zones). Pure: the zone file is passed in, so this module imports no JSON and
// the PDF module never sees a polygon. A point gets the first leaf (in file order) that holds it; the leaf is a fine zone
// or, for a region with no fine zones, the region itself. Zones are never drawn on the page and no fine name is rendered.
import { bodymap, sideOf, type Located, type View } from '../data/bodymap.ts';
export type { Located };
import { pointInRing } from './geo.ts';

export type Ring = [number, number][];
export interface ZoneFile {
  zoneSet: number;
  /** one point per coarse region: where the region list puts a mark */
  anchors: Record<string, [number, number]>;
  /** leaves only, in lookup order */
  zones: { key: string; rings: Ring[] }[];
}
const NONE: Located = { zone: null, zoneName: null, region: null, regionName: null, side: null };

/** The leaf keys of a view, in head-to-toe order: every fine zone, and each region that has none. */
export function leafKeys(view: View): string[] {
  const fine = bodymap.zones[view];
  const split = new Set(fine.map((z) => z.region));
  return [...fine.map((z) => z.key), ...bodymap.regions[view].filter((r) => !split.has(r.key)).map((r) => r.key)];
}

/** Name, region key and region name of a leaf key in a view, or null for a key that is not a leaf. */
function leaf(view: View, key: string): { zoneName: string; region: string; regionName: string } | null {
  const regions = bodymap.regions[view];
  const z = bodymap.zones[view].find((q) => q.key === key);
  if (z) return { zoneName: z.name, region: z.region, regionName: regions.find((r) => r.key === z.region)?.name ?? z.region };
  const r = regions.find((q) => q.key === key);
  return r ? { zoneName: r.name, region: r.key, regionName: r.name } : null;
}

/** Where a point (0-1 of the canvas) falls, or five nulls outside every zone. */
export function locate(file: ZoneFile, view: View, x: number, y: number): Located {
  for (const z of file.zones) {
    if (!z.rings[0] || !pointInRing([x, y], z.rings[0])) continue; // one ring per zone (a test keeps it so)
    const l = leaf(view, z.key);
    if (l) return { zone: z.key, zoneName: l.zoneName, region: l.region, regionName: l.regionName, side: sideOf(z.key) };
  }
  return NONE;
}

/**
 * What the report says about a pin. A pin from the region list takes its region from where it was put (the region's
 * anchor lies inside one of its own leaves) and has no zone, because the list says no more than the region (§B12).
 */
export function describePin(file: ZoneFile, p: { view: View; x: number; y: number; fromList: boolean }): Located {
  const at = locate(file, p.view, p.x, p.y);
  if (!p.fromList || !at.region) return at;
  return { zone: null, zoneName: null, region: at.region, regionName: at.regionName, side: sideOf(at.region) };
}

/** The anchor of a region for the list's pin, or null when the file has none. */
export function anchorOf(file: ZoneFile, region: string): [number, number] | null {
  return file.anchors[region] ?? null;
}
