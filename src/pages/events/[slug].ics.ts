import type { APIRoute } from 'astro';
import { events, eventBySlug } from '../../data/events.ts';
import { assertEvents, icsFor } from '../../lib/events.ts';
import { href } from '../../lib/url.ts';

// One calendar file per event (ARCHITECTURE §B10): /events/<slug>.ics.
export function getStaticPaths() {
  assertEvents(events);
  return events.map((e) => ({ params: { slug: e.slug } }));
}

export const GET: APIRoute = ({ params, site }) => {
  const event = eventBySlug(params.slug ?? '');
  if (!event) return new Response('Not found', { status: 404 });
  const body = icsFor(event, new URL(href('/'), site).href, new Date());
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
