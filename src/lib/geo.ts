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
  void pt;
  void ring;
  throw new Error('not implemented (step 2A)');
}

/** rings[0] is the outer boundary; any further rings are holes. */
export function pointInPolygon(pt: LngLat, rings: Ring[]): boolean {
  void pt;
  void rings;
  throw new Error('not implemented (step 2A)');
}

/**
 * The zone for a coordinate. When polygons overlap, site.zonePrecedence decides
 * (shared over home or north). A point in no polygon is 'out'.
 */
export function zoneFor(lat: number, lng: number, fc: ZoneCollection): ZoneKey {
  void lat;
  void lng;
  void fc;
  void site.zonePrecedence;
  throw new Error('not implemented (step 2A)');
}
