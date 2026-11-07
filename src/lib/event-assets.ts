// Vite-only (import.meta.glob): resolves an event's image paths, relative to src/assets/events/ (ARCHITECTURE §B10).
// Kept out of src/lib/events.ts so that file stays Node-testable.
const assets = import.meta.glob<{ default: ImageMetadata }>('../assets/events/**/*.{png,jpg}', { eager: true });

export function eventAsset(path: string): ImageMetadata {
  const found = assets[`../assets/events/${path}`];
  if (!found) throw new Error(`missing event asset: ${path}`);
  return found.default;
}
