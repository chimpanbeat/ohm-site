import type { APIRoute } from 'astro';
import { href } from '../lib/url.ts';

// Clean URLs (build.format is 'file'). /book/[zone] result pages are deliberately left out.
const paths = ['/', '/services', '/pricing', '/about', '/book'];

export const GET: APIRoute = ({ site }) => {
  const urls = paths.map((p) => `  <url><loc>${new URL(href(p), site).href}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
