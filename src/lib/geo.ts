// Zone lookup (brief §6). CONTRACT FILE: exported names and signatures are fixed.
// Bodies are implemented in step 2A. Coordinates are GeoJSON order: [lng, lat].

import { site, type ZoneKey } from '../data/site.ts';

export type LngLat = [number, number];
export type Ring = LngLat[];

export interface ZoneFeature {
  type: 'Feature';
  properties: { zone: Exclude<ZoneKey, 'out'> };
  geometry:
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] };
}

export interface ZoneCollection {
  type: 'FeatureCollection';
  features: ZoneFeature[];
}

/** Ray-cast test against one closed or open ring. Points on an edge may go either way. */
export function pointInRing(pt: LngLat, ring: Ring): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** rings[0] is the outer boundary; any further rings are holes. */
export function pointInPolygon(pt: LngLat, rings: Ring[]): boolean {
  const [outer, ...holes] = rings;
  if (!outer || !pointInRing(pt, outer)) return false;
  return !holes.some((hole) => pointInRing(pt, hole));
}

/** [west, south, east, north] in degrees. */
export type BBox = [number, number, number, number];

/**
 * Bounding box of the given zones' polygons (all zones when `zone` is omitted).
 * Null when no feature matches. Used to fit the booking map (7A).
 */
export function bboxOf(fc: ZoneCollection, zone?: Exclude<ZoneKey, 'out'>): BBox | null {
  let box: BBox | null = null;
  for (const { properties, geometry } of fc.features) {
    if (zone && properties.zone !== zone) continue;
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const [lng, lat] of polys.flatMap((rings) => rings[0] ?? [])) {
      box = box
        ? [Math.min(box[0], lng), Math.min(box[1], lat), Math.max(box[2], lng), Math.max(box[3], lat)]
        : [lng, lat, lng, lat];
    }
  }
  return box;
}

/**
 * The zone for a coordinate. When polygons overlap, site.zonePrecedence decides
 * (shared over home or north). A point in no polygon is 'out'.
 */
export function zoneFor(lat: number, lng: number, fc: ZoneCollection): ZoneKey {
  const pt: LngLat = [lng, lat];
  for (const zone of site.zonePrecedence) {
    const hit = fc.features.some(({ properties, geometry }) => {
      if (properties.zone !== zone) return false;
      return geometry.type === 'Polygon'
        ? pointInPolygon(pt, geometry.coordinates)
        : geometry.coordinates.some((rings) => pointInPolygon(pt, rings));
    });
    if (hit) return zone;
  }
  return 'out';
}
