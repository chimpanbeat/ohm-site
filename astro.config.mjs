// CONTRACT FILE. site/base come from src/data/site.ts so the DNS cutover is a config change.
import { defineConfig } from 'astro/config';
import { site } from './src/data/site.ts';
import { events } from './src/data/events.ts';
import { shortLinks } from './src/data/analytics.ts';

// Astro adds the base to a redirect's source, not its target.
const base = site.deploy.base.replace(/\/+$/, '');

export default defineConfig({
  site: site.deploy.site,
  base: site.deploy.base,
  output: 'static',
  // Redirect pages: meta refresh (delay 0), canonical to the target, noindex, no script. With output 'static' and no
  // adapter, Astro writes an HTML page, not an HTTP 301, so on GitHub Pages every redirect here is non-permanent: browsers
  // cache nothing and a target can change later. Targets are plain strings: `{ status: 302 }` would add a 2 s delay.
  // E8, I-092: event pages live at /events/<slug>; the short /<slug> (sent in confirmation emails, shared by hand) redirects.
  // I-147: printed short links (QR codes on print), from src/data/analytics.ts; no link is typed here.
  redirects: {
    ...Object.fromEntries(events.map((e) => [`/${e.slug}`, `${base}/events/${e.slug}`])),
    ...Object.fromEntries(Object.entries(shortLinks).map(([from, to]) => [from, `${base}${to}`])),
  },
  trailingSlash: 'ignore',
  server: { port: 4321 }, // must match the Google key's localhost referrer
  build: {
    format: 'file', // services.html is served at /services with no 301 on GitHub Pages
    inlineStylesheets: 'always', // I-053: no render-blocking CSS request before first paint
  },
});
