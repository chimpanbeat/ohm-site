import type { APIRoute } from 'astro';
import { events } from '../data/events.ts';
import { href } from '../lib/url.ts';

// Clean URLs (build.format is 'file'). /book/[zone] result pages are deliberately left out, and so are events
// that aren't `index: true` (the launch party is shared by URL only, I-063).
const paths = ['/', '/services', '/pricing', '/about', '/book', '/client-policies', ...events.filter((e) => e.index).map((e) => `/events/${e.slug}`)];

export const GET: APIRoute = ({ site }) => {
  const urls = paths.map((p) => `  <url><loc>${new URL(href(p), site).href}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
