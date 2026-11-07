// Makes the small credit images for "This event made possible by…" (E4, I-079; ARCHITECTURE §B6, §B10).
// Run by hand: npm run event-images. Not part of `check` or CI: the inputs under brief/ are gitignored
// (the permissions are Brian's), so only the outputs under src/assets/events/launch-party/ are committed.
// Every output is 112 px tall (shown at 56 px, so 2x), has no metadata (sharp strips it unless asked),
// and keeps its own background: no keying, no transparency (a black or white tile, read as a logo on the page).
import sharp from 'sharp';
import { existsSync, statSync } from 'node:fs';

const OUT = 'src/assets/events/launch-party';
const HEIGHT = 112;

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
  {
    out: 'cityrock-logo.png',
    input: 'brief/launch_party_graphics/cityrock_logo.png', // wordmark plus 60 px of its black
    extract: { left: 12, top: 277, width: 2034, height: 677 },
  },
  {
    out: 'johnmark-logo.png',
    input: 'brief/launch_party_graphics/johnmark_logo.png', // already padded
  },
];

for (const job of JOBS) {
  if (!existsSync(job.input)) {
    console.error(`event-images: missing input ${job.input} (brief/ is gitignored; copy it from Brian's folder)`);
    process.exit(1);
  }
}

for (const job of JOBS) {
  let img = sharp(job.input);
  if (job.extract) img = img.extract(job.extract);
  img = job.square ? img.resize(HEIGHT, HEIGHT) : img.resize({ height: HEIGHT });
  img = job.jpeg ? img.jpeg({ quality: 80 }) : img.png();
  const info = await img.toFile(`${OUT}/${job.out}`);
  console.log(`${job.out}: ${info.width}x${info.height}, ${(statSync(`${OUT}/${job.out}`).size / 1024).toFixed(1)} KB`);
}
