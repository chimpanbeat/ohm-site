// Vite-only (import.meta.glob): resolves an event's image paths, relative to src/assets/events/ (ARCHITECTURE §B10).
// Kept out of src/lib/events.ts so that file stays Node-testable.
const assets = import.meta.glob<{ default: ImageMetadata }>('../assets/events/**/*.{png,jpg}', { eager: true });

export function eventAsset(path: string): ImageMetadata {
  const found = assets[`../assets/events/${path}`];
  if (!found) throw new Error(`missing event asset: ${path}`);
  return found.default;
}

// E11 (I-104): the traced launch mark made by `npm run event-banner`.
export interface EventMark {
  viewBox: string;
  box: { left: number; top: number; width: number; height: number };
  accent: string;
  light: string;
}
const marks = import.meta.glob<{ default: EventMark }>('../assets/events/**/*.json', { eager: true });

export function eventMark(path: string): EventMark {
  const found = marks[`../assets/events/${path}`];
  if (!found) throw new Error(`missing event asset: ${path}`);
  return found.default;
}
