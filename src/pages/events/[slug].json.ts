import type { APIRoute } from 'astro';
import { events, eventBySlug } from '../../data/events.ts';
import { assertEvents, feedFor } from '../../lib/events.ts';
import { href } from '../../lib/url.ts';

// The public feed the RSVP Apps Script reads (ARCHITECTURE §B10): /events/<slug>.json, only for events with an RSVP.
// Public facts only; never guest data.
export function getStaticPaths() {
  assertEvents(events);
  return events.filter((e) => e.rsvp).map((e) => ({ params: { slug: e.slug } }));
}

export const GET: APIRoute = ({ params, site }) => {
  const event = eventBySlug(params.slug ?? '');
  if (!event) return new Response('Not found', { status: 404 });
  const body = JSON.stringify(feedFor(event, new URL(href('/'), site).href));
  return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
