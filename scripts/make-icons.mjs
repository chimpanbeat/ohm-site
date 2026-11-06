// Generates public/ icons from brief/logo (ARCHITECTURE §B6). Run: npm run icons
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

// The favicon square is --green-900, read from tokens.css so the hex stays in one place.
const GREEN = readFileSync('src/styles/tokens.css', 'utf8').match(/--green-900:\s*(#[0-9a-f]{6})/i)?.[1];
if (!GREEN) throw new Error('--green-900 not found in src/styles/tokens.css');
mkdirSync('public', { recursive: true });

// favicon: anatomy detail is unreadable at 32px, so the icon sits at 80% on a green square.
const inner = Math.round(32 * 0.8);
const icon = await sharp('brief/logo/Icon.png')
  .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
await sharp({ create: { width: 32, height: 32, channels: 4, background: GREEN } })
  .composite([{ input: icon, gravity: 'center' }])
  .png()
  .toFile('public/favicon-32.png');

await sharp('brief/logo/Icon_Background.png').resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp('brief/logo/Icon_Background.png').resize(512, 512).png().toFile('public/icon-512.png');

console.log('Wrote public/favicon-32.png, apple-touch-icon.png, icon-512.png');
