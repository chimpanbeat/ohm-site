// Makes the small credit images for "This event made possible by…" (E4, I-079; ARCHITECTURE §B6, §B10).
// Run by hand: npm run event-images. Not part of `check` or CI: the inputs under brief/ are gitignored
// (the permissions are Brian's), so only the outputs under src/assets/events/launch-party/ are committed.
// Every output is 112 px tall (shown at 56 px, so 2x) and has no metadata (sharp strips it unless asked).
// Photos keep their frame (the page draws it). The two logos are transparent RGBA PNGs (E5, I-085) that sit on the
// cream band with no box: CityROCK's source is a transparent avif (Brian, Nov 7), so it is only cropped and
// resized; JohnMark's source has a white background, which `key: 'white'` turns into alpha at full resolution
// (after the crop, before the resize, so the edges are anti-aliased against nothing).
import sharp from 'sharp';
import { existsSync, readFileSync, statSync } from 'node:fs';

const OUT = 'src/assets/events/launch-party';
const HEIGHT = 112;
// The placeholder tile's colour is --green-300, read from tokens.css so the hex stays in one place.
const GREEN_300 = readFileSync('src/styles/tokens.css', 'utf8').match(/--green-300:\s*(#[0-9a-f]{6})/i)?.[1];
if (!GREEN_300) throw new Error('--green-300 not found in src/styles/tokens.css');

// extract = { left, top, width, height } in the input's pixels; absent: the whole image.
const JOBS = [
  {
    out: 'marea-thumb.jpg',
    input: `${OUT}/marea-host.jpg`, // committed; the cars and blurred plates (x >= 590) stay out of the crop
    extract: { left: 0, top: 250, width: 580, height: 580 },
    square: true,
    jpeg: true,
  },
  {
    out: 'britt-thumb.jpg',
    input: 'brief/launch_party_graphics/britt_photo.jpg', // an Instagram screenshot: face and hair only
    extract: { left: 380, top: 230, width: 460, height: 460 },
    square: true,
    jpeg: true,
  },
  // I-089/I-090 (E8): John Marshall's photo comes from Marea's reviewer page (db collection `checks`, doc `photo-john`, field
  // `asset`). Until it is there this is a plain --green-300 tile. TODO(I-090): when the photo arrives, save it as
  // brief/launch_party_graphics/john_photo.<ext> (gitignored), replace this job with
  //   { out: 'john-thumb.jpg', input: <that path>, extract: <a square face crop>, square: true, jpeg: true }
  // run `npm run event-images` and keep only the new john-thumb.jpg.
  { out: 'john-thumb.jpg', input: 'brief/launch_party_graphics/john_photo.jpg', extract: { left: 0, top: 340, width: 3024, height: 3024 }, square: true, jpeg: true },
  {
    out: 'cityrock-logo.png',
    input: 'brief/launch_party_graphics/cityrock_logo.avif', // 7559x4571 RGBA, already transparent
    extract: { left: 19, top: 1320, width: 7478, height: 2174 }, // the ink's bounding box (alpha > 8)
  },
  {
    out: 'johnmark-logo.png',
    input: 'brief/launch_party_graphics/johnmark_logo.png', // white background
    extract: { left: 17, top: 0, width: 570, height: 140 }, // its ink starts at x 0, lined up with the text below
    key: 'white',
  },
];

for (const job of JOBS) {
  if (!job.placeholder && !existsSync(job.input)) {
    console.error(`event-images: missing input ${job.input} (brief/ is gitignored; copy it from Brian's folder)`);
    process.exit(1);
  }
}

// White to alpha: n = min(r, g, b); a = min(1, (255 - n) / 215); colour = (c - 255 (1 - a)) / a, clamped.
async function keyWhite(img) {
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const n = Math.min(data[i], data[i + 1], data[i + 2]);
    const a = Math.min(1, (255 - n) / 215);
    if (a > 0) {
      for (let c = 0; c < 3; c++) out[o + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - 255 * (1 - a)) / a)));
    }
    out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
}

for (const job of JOBS) {
  let img = job.placeholder
    ? sharp({ create: { width: HEIGHT, height: HEIGHT, channels: 3, background: GREEN_300 } })
    : sharp(job.input);
  if (job.extract) img = img.extract(job.extract);
  if (job.key === 'white') img = await keyWhite(img);
  img = job.square ? img.resize(HEIGHT, HEIGHT) : img.resize({ height: HEIGHT });
  img = job.jpeg ? img.jpeg({ quality: 80 }) : img.png({ compressionLevel: 9 });
  const info = await img.toFile(`${OUT}/${job.out}`);
  console.log(`${job.out}: ${info.width}x${info.height}, ${(statSync(`${OUT}/${job.out}`).size / 1024).toFixed(1)} KB`);
}
