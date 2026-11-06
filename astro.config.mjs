// CONTRACT FILE. site/base come from src/data/site.ts so the DNS cutover is a config change.
import { defineConfig } from 'astro/config';
import { site } from './src/data/site.ts';

export default defineConfig({
  site: site.deploy.site,
  base: site.deploy.base,
  output: 'static',
  trailingSlash: 'ignore',
  server: { port: 4321 }, // must match the Google key's localhost referrer
  build: {
    format: 'file', // services.html is served at /services with no 301 on GitHub Pages
    inlineStylesheets: 'always', // I-053: no render-blocking CSS request before first paint
  },
});
