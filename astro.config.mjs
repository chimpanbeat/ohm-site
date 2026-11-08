// CONTRACT FILE. site/base come from src/data/site.ts so the DNS cutover is a config change.
import { defineConfig } from 'astro/config';
import { site } from './src/data/site.ts';
import { events } from './src/data/events.ts';

export default defineConfig({
  site: site.deploy.site,
  base: site.deploy.base,
  output: 'static',
  // E8, I-092: event pages live at /events/<slug>; the short /<slug> (sent in confirmation emails, shared by hand)
  // stays as a redirect page: meta refresh, canonical to the new URL, noindex. If site.deploy.base changes, so do these.
  redirects: Object.fromEntries(events.map((e) => [`/${e.slug}`, `/events/${e.slug}`])),
  trailingSlash: 'ignore',
  server: { port: 4321 }, // must match the Google key's localhost referrer
  build: {
    format: 'file', // services.html is served at /services with no 301 on GitHub Pages
    inlineStylesheets: 'always', // I-053: no render-blocking CSS request before first paint
  },
});
