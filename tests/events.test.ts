import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/data/site.ts';
import { events, rsvpText, launchParty, eventBySlug } from '../src/data/events.ts';
import type { SiteEvent } from '../src/data/events.ts';
import {
  RESERVED_SLUGS,
  assertEvent,
  assertEvents,
  dateLabel,
  timeLabel,
  mapsUrl,
  icsFor,
  feedFor,
  eventPaths,
  plainText,
} from '../src/lib/events.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const base = site.deploy.base.replace(/\/+$/, '');
const origin = site.deploy.customDomain;
const host = new URL(origin).host;
const siteUrl = new URL(`${base}/`, origin).href;
const TZ = 'America/Denver';

const party = events.find((e) => e.slug === 'launch-party')!;
const clone = (): SiteEvent => structuredClone(party);

// Plain text of built HTML: tags gone, entities decoded.
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// A second, minimal event: no RSVP, no description, no credits.
const synthetic: SiteEvent = {
  slug: 'summer-yoga',
  title: 'Summer Yoga',
  summary: 'A morning of yoga.',
  start: '2027-07-10T09:00:00-06:00',
  end: '2027-07-10T10:30:00-06:00',
  timeZone: TZ,
  venue: { name: 'The Park', address: '1 Main St, Colorado Springs, CO 80903' },
  timeline: [{ start: '2027-07-10T11:30:00-06:00', end: '2027-07-10T13:00:00-06:00', title: 'Brunch' }],
  info: [],
  notices: [],
  graphics: { wide: 'launch-party/header-green.png', narrow: 'launch-party/launch-mark-on-dark.png', og: 'launch-party/header-green.png', alt: 'Summer Yoga' },
  index: true,
};

test('1a. launch party data equals the copy deck', () => {
  assert.equal(party.title, 'Ohm Launch Party: A Celebration of Self-Care');
  assert.equal(party.summary, 'Restorative yoga, the Self Care Launch Party and an optional climb at the gym.');
  assert.equal(party.start, '2026-11-22T14:00:00-07:00');
  assert.equal(party.end, '2026-11-22T18:00:00-07:00');
  assert.equal(party.timeZone, TZ);
  assert.deepEqual(party.venue, { name: 'CityROCK', address: '21 N Nevada Ave, Colorado Springs, CO 80903' });
  assert.equal(party.heading, 'A Celebration of Self-Care'); // E4, I-078: the on-page H1
  assert.ok(!('host' in party), 'the host section is gone (E4, I-079)');
  assert.equal(party.index, false);
  assert.equal(party.graphics.alt, 'Ohm Precision Bodywork Launch Party');
  assert.ok(!('ogAlt' in party.graphics));

  // E4, I-077: the description (licensed variant), P1 to P4
  assert.deepEqual(
    party.description!.map((p) => plainText(p, 1)),
    [
      "A year and a half ago, Brian left his electrical engineering career and stepped into the unknown, in search of a more soul-fulfilling way to contribute to the world. Last month, he completed 650 hours of studies and passed his state test to become a licensed neuromuscular massage therapist! 🎉 We invite our community to join us as we celebrate the beginning of Brian's new career and the launch of his business: Ohm Precision Bodywork.",
      'This event welcomes you into a space of celebration as well as self-care, equal parts joy and rest. Our beloved friend Britt will be guiding us through a beginner-friendly restorative yoga practice and sound bath, meant to help you release tension and reconnect with your body.',
      "Following the yoga class, you're invited to enjoy healthy snacks and cozy drinks, make new friends, and participate in activities designed to reset your nervous system. By completing activities, you'll have the opportunity to win a body care gift basket and some limited edition Ohm merch!",
      "We hope you'll bless us with your presence as we come together to usher Brian into a joyful new era. ⚡",
    ],
  );
  assert.deepEqual(party.description![0], [
    party.description![0][0],
    { w: 'launchStateTest' },
    party.description![0][2],
  ]);
  assert.deepEqual(party.description![1][1], { text: 'Britt', href: 'https://www.instagram.com/brittandspirit/' });

  // E4, I-078: the schedule (notes flattened to text, licensed variant)
  assert.deepEqual(
    party.timeline.map((i) => [i.title, (i.notes ?? []).map((n) => plainText(n, 1)), Boolean(i.optional)]),
    [
      ['Arrive for yoga, get settled in', [], false],
      [
        'Restorative Yoga with Britt',
        ['No supplies or experience needed', 'Mats provided, or bring your own', 'Water bottle and stretchy clothes recommended', 'Limited to first 20 sign-ups'],
        false,
      ],
      ['Self Care Launch Party', ['Open house style, come and go as you please', 'Refreshments provided', 'Activities and merch'], false],
      ['Optional: climb at the gym until close', ['Day pass purchase required', 'Harness and shoes provided'], true],
    ],
  );
  assert.deepEqual(party.timeline[3].notes![0], [{ text: 'Day pass purchase required', href: 'https://climbcityrock.com/day-passes' }]);

  // E4, I-079: "This event made possible by…" (Marea's labels)
  assert.deepEqual(party.credits, {
    heading: 'This event made possible by…',
    items: [
      { name: 'Maréa', role: 'host', url: 'https://dreamcatcherwed.com', image: 'launch-party/marea-thumb.jpg', alt: '' },
      { name: 'CityROCK', role: 'venue space donated', url: 'https://climbcityrock.com', image: 'launch-party/cityrock-logo.png', alt: '' },
      { name: 'Britt Maddy', role: 'yoga class generously provided', url: 'https://www.instagram.com/brittandspirit/', image: 'launch-party/britt-thumb.jpg', alt: '' },
      { name: 'JohnMark', role: 'graphic design', url: 'https://johnmark.co', image: 'launch-party/johnmark-logo.png', alt: 'Rantala Creative' },
    ],
  });
  const name = party.credits!.items[0].name;
  assert.equal(name, 'Maréa');
  assert.equal(name, name.normalize('NFC'), 'the é is one character');
  assert.ok(!JSON.stringify(party).includes('Marea'), 'no unaccented Marea anywhere in the data');

  assert.deepEqual(
    party.info.map((b) => b.id),
    ['wear', 'parking', 'raffle'],
  );
  const [wear, parking, raffle] = party.info;
  assert.equal(wear.title, 'What to wear');
  assert.deepEqual(wear.items, ['Comfy cozy: yoga clothes or sweat pants', 'Fuzzy socks encouraged', 'Shoes off in the yoga room']); // E4: mats moved to the yoga item
  assert.equal(wear.inReminder, true);
  assert.equal(parking.title, 'Parking');
  assert.equal(parking.text, "Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks.");
  assert.equal(parking.inReminder, true);
  assert.equal(raffle.title, 'Raffle');
  assert.equal(
    raffle.text,
    'Complete the activities at the party for a chance to win a body care gift basket and limited-edition Ohm merch.',
  );
  assert.ok(!raffle.inReminder);

  assert.equal(party.notices.length, 1);
  const waiver = party.notices[0];
  assert.equal(waiver.id, 'waiver');
  assert.equal(waiver.title, 'Important: Waiver Required');
  assert.equal(
    waiver.text,
    "If you haven't been to CityROCK in the last 2 years, you'll be required to fill out a waiver to enter the building. We recommend filling this out in advance, but it can be done in person if you forget!",
  );
  assert.deepEqual(waiver.link, { label: 'Fill out the waiver', url: 'https://portal.climbcityrock.com/cityrockdowntown/agreements/cityrock-waiver' });
  assert.equal(waiver.inEmails, true);
});

test('1b. RSVP settings; the sign-up note follows the limit', () => {
  assert.deepEqual(party.rsvp?.session, { key: 'yoga', label: 'Yoga', item: 1, limit: 20, waitlist: true });
  assert.equal(party.rsvp?.showGoing, false);
  assert.equal(party.rsvp?.closesAt, party.start);
  assert.equal(party.rsvp?.maxGuests, 10);
  assert.equal(party.rsvp?.reminderAt, '2026-11-21T10:00:00-07:00');

  const twelve = launchParty(12);
  assert.equal(twelve.rsvp?.session?.limit, 12);
  const notesOf = (e: SiteEvent) => e.timeline[1].notes!.map((n) => plainText(n, 1));
  assert.ok(notesOf(twelve).includes('Limited to first 12 sign-ups'));
  assert.ok(!notesOf(twelve).some((n) => n.includes('20')));
  assert.equal(notesOf(twelve)[1], 'Mats provided, or bring your own'); // E4: the mats note stays second
  assert.equal(notesOf(launchParty(20))[1], 'Mats provided, or bring your own');
  assert.ok(notesOf(launchParty(20)).includes('Limited to first 20 sign-ups'));
  assert.equal(eventBySlug('launch-party'), party);
  assert.equal(eventBySlug('nope'), undefined);
});

test('1c. rsvpText equals the copy deck table', () => {
  const deck = readFileSync(join(root, 'docs/build/copy-deck.md'), 'utf8');
  const start = deck.indexOf('### RSVP text');
  const end = deck.indexOf('\n###', start + 5);
  const block = deck.slice(start, end);
  const expected: Record<string, string> = {};
  for (const line of block.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line.split(/(?<=`) \| (?=`)/);
    assert.equal(cells.length, 2, `row: ${line}`);
    const spans = (s: string) => [...s.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
    const keys = spans(cells[0]);
    const texts = spans(cells[1]).slice(0, keys.length);
    assert.equal(texts.length, keys.length, `row: ${line}`);
    keys.forEach((k, i) => (expected[k] = texts[i]));
  }
  assert.ok(Object.keys(expected).length > 60, 'parsed the whole table');
  assert.deepEqual(rsvpText, expected);
});

test('1d. every image path in the data exists under src/assets/events/', () => {
  const paths = [party.graphics.wide, party.graphics.narrow, party.graphics.og, ...party.credits!.items.map((c) => c.image)];
  for (const p of paths) assert.ok(existsSync(join(root, 'src/assets/events', p)), `missing ${p}`);
  // the source of marea-thumb.jpg stays committed (E4 re-runs `npm run event-images` from it)
  assert.ok(existsSync(join(root, 'src/assets/events/launch-party/marea-host.jpg')));
});

test('1e. licensure clause: the unlicensed description claims nothing (§A6, E4)', () => {
  const claim = /\bmassage|\bLMT\b|\blicen/i;
  const p1 = party.description![0];
  const unlicensed = plainText(p1, 0);
  assert.ok(!claim.test(unlicensed), unlicensed);
  assert.ok(unlicensed.includes('650 hours of studies! 🎉 We invite'), unlicensed);
  assert.ok(plainText(p1, 1).includes('passed his state test to become a licensed neuromuscular massage therapist! 🎉'));
  // every plain string in the event: the licensure words only ever come from a { w } piece
  const strings: string[] = [];
  (function walk(v: unknown) {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object' && !('w' in v)) Object.values(v).forEach(walk);
  })(launchParty(20));
  for (const s of strings) assert.ok(!claim.test(s), `licensure word in plain string: ${s}`);
});

test('2. guards', () => {
  assert.doesNotThrow(() => assertEvents(events));
  assert.throws(() => assertEvent({ ...clone(), slug: 'Launch_Party' }), /slug/);
  assert.throws(() => assertEvents([clone(), clone()]), /duplicate/);
  assert.throws(() => assertEvent({ ...clone(), slug: 'book' }), /reserved/);
  for (const slug of RESERVED_SLUGS) assert.throws(() => assertEvent({ ...clone(), slug }), /slug|reserved/, slug);
  assert.throws(() => assertEvent({ ...clone(), end: '2026-11-22T13:00:00-07:00' }), /end/);
  assert.throws(() => assertEvent({ ...clone(), start: '2026-11-22T14:00:00-06:00', end: '2026-11-22T18:00:00-06:00' }), /offset/);
  assert.throws(() => assertEvent({ ...clone(), start: '2026-11-22T14:00:00', end: '2026-11-22T18:00:00' }), /offset/);
  const badReminder = clone();
  badReminder.rsvp!.reminderAt = '2026-11-21T10:00:00-06:00';
  assert.throws(() => assertEvent(badReminder), /offset/);
  const badItem = clone();
  badItem.rsvp!.session!.item = 9;
  assert.throws(() => assertEvent(badItem), /item/);
  const going = clone();
  going.rsvp!.showGoing = true;
  assert.throws(() => assertEvent(going), /showGoing has no design yet \(I-049\): decide what it shows first/);
  assert.doesNotThrow(() => assertEvent(synthetic));

  // E4 guards: https links, known wording keys, complete credits
  const http = clone();
  http.timeline[3].notes = [[{ text: 'Day pass', href: 'http://climbcityrock.com/day-passes' }]];
  assert.throws(() => assertEvent(http), /https/);
  const httpDesc = clone();
  httpDesc.description![1] = [{ text: 'Britt', href: 'http://www.instagram.com/brittandspirit/' }];
  assert.throws(() => assertEvent(httpDesc), /https/);
  const httpCredit = clone();
  httpCredit.credits!.items[1].url = 'http://climbcityrock.com';
  assert.throws(() => assertEvent(httpCredit), /https/);
  const badKey = clone();
  badKey.description![0] = ['Text ', { w: 'nope' }];
  assert.throws(() => assertEvent(badKey), /unknown wording key "nope"/);
  const noName = clone();
  noName.credits!.items[0].name = '';
  assert.throws(() => assertEvent(noName));
  const noImage = clone();
  noImage.credits!.items[2].image = '';
  assert.throws(() => assertEvent(noImage));
  assert.doesNotThrow(() => assertEvent(clone()));
  assert.doesNotThrow(() => assertEvent(launchParty(12)));
});

test('2c. plainText joins strings, link text and the chosen wording variant', () => {
  assert.equal(plainText('Plain', 0), 'Plain');
  assert.equal(plainText(['A ', { text: 'link', href: 'https://example.com' }, ' B', { w: 'credential' }], 0), 'A link B');
  assert.equal(plainText(['A', { w: 'licensedIn' }], 1), 'ALicensed in Colorado.');
});

test('2b. RESERVED_SLUGS covers every top-level entry of src/pages/ and public/', () => {
  const names = [...readdirSync(join(root, 'src/pages')), ...readdirSync(join(root, 'public'))]
    .filter((n) => !n.startsWith('['))
    .map((n) => n.split('.')[0]); // robots.txt.ts → robots
  for (const n of [...names, 'events', '_astro', 'index', '404']) assert.ok(RESERVED_SLUGS.includes(n), `RESERVED_SLUGS lacks "${n}"`);
});

test('3. labels', () => {
  assert.equal(dateLabel(party.start, TZ), 'Sunday, Nov 22, 2026');
  const out: string[] = [];
  out.push(timeLabel(party.start, party.end, TZ, 'always'));
  assert.equal(out[0], '2:00–6:00 pm');
  const auto = party.timeline.map((i) => timeLabel(i.start, i.end, TZ, 'auto'));
  assert.deepEqual(auto, ['1:45 pm', '2–3 pm', '3–6 pm', '6–8 pm']);
  out.push(...auto);
  const synth = timeLabel(synthetic.timeline[0].start, synthetic.timeline[0].end, TZ, 'auto');
  assert.equal(synth, '11:30 am–1 pm');
  out.push(synth, timeLabel('2026-11-22T11:30:00-07:00', '2026-11-22T13:00:00-07:00', TZ, 'always'));
  assert.equal(out[out.length - 1], '11:30 am–1:00 pm');
  for (const s of out) assert.ok(!/[  ]/.test(s), `narrow no-break space in "${s}"`);
  assert.ok(!/[  ]/.test(dateLabel(party.start, TZ)));
});

test('4. ICS', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const ics = icsFor(party, siteUrl, now);
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/(^|[^\r])\n/.test(ics), 'every line ends CRLF');
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `line over 75 octets: ${line}`);
  const lines = ics.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  for (const l of ['VERSION:2.0', 'PRODID:-//Ohm Precision Bodywork//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'END:VEVENT', 'END:VCALENDAR']) {
    assert.ok(lines.includes(l), l);
  }
  assert.ok(lines.includes('DTSTART:20261122T210000Z'));
  assert.ok(lines.includes('DTEND:20261123T010000Z'));
  assert.ok(lines.includes('DTSTAMP:20261106T120000Z'));
  assert.ok(lines.includes(`UID:${party.slug}@${host}`));
  assert.ok(lines.includes('SUMMARY:Ohm Launch Party: A Celebration of Self-Care'));
  assert.ok(lines.includes('LOCATION:CityROCK\\, 21 N Nevada Ave\\, Colorado Springs\\, CO 80903'));
  assert.ok(lines.includes(`URL:${origin}${base}/launch-party`));

  // a 200-character title folds, and unfolding gives it back (with a multi-byte character in it)
  const long = clone();
  long.title = ('Long title – ' + 'x'.repeat(200)).slice(0, 200);
  const folded = icsFor(long, siteUrl, now);
  assert.ok(folded.includes('\r\n '), 'folded');
  for (const line of folded.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, 'folded line over 75 octets');
  assert.ok(folded.replace(/\r\n /g, '').split('\r\n').includes(`SUMMARY:${long.title}`));

  const esc = clone();
  esc.title = 'A, B; C\\D\nE';
  assert.ok(icsFor(esc, siteUrl, now).replace(/\r\n /g, '').includes('SUMMARY:A\\, B\\; C\\\\D\\nE\r\n'));
});

test('5. mapsUrl', () => {
  assert.equal(mapsUrl(party.venue), 'https://www.google.com/maps/search/?api=1&query=CityROCK%2C+21+N+Nevada+Ave%2C+Colorado+Springs%2C+CO+80903');
});

test('6. eventPaths', () => {
  const real = eventPaths(events);
  assert.deepEqual(real.map((p) => p.params.event), ['launch-party']);
  assert.equal(real[0].props.event, party);
  const two = eventPaths([...events, synthetic]);
  assert.deepEqual(two.map((p) => p.params.event), ['launch-party', 'summer-yoga']);
  assert.throws(() => feedFor(synthetic, siteUrl), /rsvp/);
  assert.throws(() => eventPaths([...events, { ...synthetic, slug: 'launch-party' }]), /duplicate/);
});

test('7. feed', () => {
  const feed = feedFor(party, siteUrl);
  assert.deepEqual(Object.keys(feed).sort(), [
    'closesAt', 'dateLabel', 'end', 'icsUrl', 'maxGuests', 'notices', 'pageUrl', 'reminderAt', 'reminderInfo',
    'sender', 'session', 'slug', 'start', 'text', 'timeLabel', 'title', 'v', 'venue',
  ]);
  assert.equal(feed.v, 1);
  assert.equal(feed.slug, 'launch-party');
  assert.equal(feed.dateLabel, 'Sunday, Nov 22, 2026');
  assert.equal(feed.timeLabel, '2:00–6:00 pm');
  assert.equal(feed.pageUrl, `${origin}${base}/launch-party`);
  assert.equal(feed.icsUrl, `${origin}${base}/events/launch-party.ics`);
  assert.deepEqual(feed.session, { key: 'yoga', label: 'Yoga', limit: 20, waitlist: true, time: '2–3 pm' });
  assert.deepEqual(feed.reminderInfo.map((b) => b.title), ['What to wear', 'Parking']);
  assert.deepEqual(feed.notices, [{ title: party.notices[0].title, text: party.notices[0].text, url: party.notices[0].link!.url }]);
  assert.deepEqual(feed.sender, { name: site.name, replyTo: site.email });
  assert.equal(feed.text, rsvpText);
  const json = JSON.stringify(feed);
  assert.ok(!('showGoing' in feed) && !json.includes('showGoing'));
  assert.equal(json.split('@').length - 1, 1, 'the only @ is the reply-to address');
});

test('8. source: event facts live in events.ts only; no hex in the components', () => {
  const skip = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.woff2', '.woff', '.geojson', '.json']);
  const files: string[] = [];
  (function walk(dir: string) {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (!skip.has(extname(p).toLowerCase())) files.push(p);
    }
  })(join(root, 'src'));
  for (const f of files) {
    if (f.replace(/\\/g, '/').endsWith('src/data/events.ts')) continue;
    const src = readFileSync(f, 'utf8');
    for (const word of ['CityROCK', 'Wahsatch', 'launch-party']) assert.ok(!src.includes(word), `${f} contains ${word}`);
  }
  const dir = join(root, 'src/components/events');
  assert.ok(existsSync(dir));
  for (const n of readdirSync(dir)) {
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(readFileSync(join(dir, n), 'utf8')), `${n} has a hex colour`);
  }
});

test('8b. source: E4 components and styles', () => {
  const comp = (n: string) => readFileSync(join(root, 'src/components/events', n), 'utf8');
  assert.ok(!existsSync(join(root, 'src/components/events/EventHost.astro')), 'EventHost is deleted');
  for (const n of ['EventRich.astro', 'EventDescription.astro', 'EventCredits.astro']) assert.ok(existsSync(join(root, 'src/components/events', n)), n);

  // the guest's yoga question is visible (I-078 part 4)
  assert.ok(!/<legend class="visually-hidden">/.test(comp('RsvpForm.astro')), 'no visually-hidden legend left in the RSVP form');

  // the waiver notice is a light box on the green band (I-080 part 1)
  const notice = comp('EventNotice.astro');
  for (const token of ['--bg-light', '--green-300', '--link-on-light']) assert.ok(notice.includes(`var(${token})`), `notice uses ${token}`);
  assert.ok(!notice.includes('--line-dark'), 'the notice has no dark-band border');

  // the wide banner crop (I-080 part 2): inside the 48rem block
  const hero = comp('EventHero.astro');
  const wide = hero.slice(hero.indexOf('@media (min-width: 48rem)'));
  assert.ok(wide.length > 0 && hero.includes('@media (min-width: 48rem)'), 'a 48rem media block');
  for (const decl of ['aspect-ratio: 11 / 4', 'object-fit: cover', 'object-position: 50% 50%', 'scale: 1.5152', 'max-width: 60rem']) {
    assert.ok(wide.includes(decl), `wide block has ${decl}`);
  }
  assert.ok(hero.includes('alt={event.graphics.alt}'), 'the header graphic has its alt');
  assert.ok(hero.includes('event.heading ?? event.title'), 'the H1 is heading ?? title');

  // check:contrast knows the notice's link pair
  assert.match(readFileSync(join(root, 'scripts/check-contrast.mjs'), 'utf8'), /green-700 \(link on light\)/);
});

// Built output. Skipped with a reason when the site hasn't been built.
const built = existsSync(join(dist, 'launch-party.html'));
const skipBuilt = built ? false : 'dist/launch-party.html is missing; run `npm run build` first';
const page = () => readFileSync(join(dist, 'launch-party.html'), 'utf8');
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const meta = (html: string, key: string, name = 'property') =>
  attr(html.match(new RegExp(`<meta\\b[^>]*\\b${name}="${key}"[^>]*>`))?.[0] ?? '', 'content');

test('9a. built page: head', { skip: skipBuilt }, () => {
  const html = page();
  assert.equal(text(html.match(/<h1\b[\s\S]*?<\/h1>/)![0]), 'A Celebration of Self-Care'); // E4: the graphic says the rest
  assert.match(html, /<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/);
  assert.match(html, new RegExp(`<link\\b[^>]*\\brel="canonical"[^>]*\\bhref="${origin}${base}/launch-party"`));
  const og = meta(html, 'og:image')!;
  assert.ok(og.startsWith(`${origin}/`) && /\.jpe?g$/.test(og), `og:image ${og}`);
  assert.equal(meta(html, 'og:image:width'), '857');
  assert.equal(meta(html, 'og:image:height'), '450');
  assert.equal(meta(html, 'og:image:alt'), 'Ohm Precision Bodywork Launch Party');
  assert.equal(meta(html, 'twitter:image', 'name'), og);
  assert.match(html, /<title>Ohm Launch Party: A Celebration of Self-Care · Ohm Precision Bodywork<\/title>/);
  assert.equal(
    meta(html, 'description', 'name'),
    'Sunday, Nov 22, 2026, 2:00–6:00 pm at CityROCK. Restorative yoga, the Self Care Launch Party and an optional climb at the gym.',
  );
});

test('9b. built page: hero, timeline, links, notice', { skip: skipBuilt }, () => {
  const html = page();
  const hero = html.match(/<section\b[\s\S]*?<\/section>/)![0];
  assert.ok(hero.includes('<picture'), 'hero is a picture');
  assert.match(text(hero), /Sunday, Nov 22, 2026 · 2:00–6:00 pm/);
  assert.ok(hero.includes('href="#rsvp"'), 'the hero has the RSVP button (E2)');

  const ol = html.match(/<ol\b[^>]*class="[^"]*\btimeline\b[^"]*"[\s\S]*?<\/ol>/)![0];
  const times = [...ol.matchAll(/<time\b[^>]*\bdatetime="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(times, ['2026-11-22T13:45:00-07:00', '2026-11-22T14:00:00-07:00', '2026-11-22T15:00:00-07:00', '2026-11-22T18:00:00-07:00']);
  const titles = [...ol.matchAll(/<h3\b[\s\S]*?<\/h3>/g)].map((m) => text(m[0]));
  assert.deepEqual(titles, party.timeline.map((i) => i.title));
  assert.equal([...ol.matchAll(/<li\b[^>]*\btimeline__item\b/g)].length, 4);
  assert.match(ol, /timeline__item--optional/);

  const links = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  const maps = links.find((l) => attr(l, 'href')?.replace(/&amp;/g, '&') === mapsUrl(party.venue))!;
  assert.ok(maps, 'maps link');
  assert.equal(attr(maps, 'target'), '_blank');
  assert.match(attr(maps, 'rel')!, /noopener/);
  const cal = links.find((l) => attr(l, 'href') === `${base}/events/launch-party.ics`)!;
  assert.ok(cal, 'calendar link');
  assert.match(cal, /\bdownload\b/);
  const waiver = links.find((l) => attr(l, 'href') === party.notices[0].link!.url)!;
  assert.ok(waiver, 'waiver link');
  assert.equal(attr(waiver, 'target'), '_blank');

  const body = text(html);
  assert.ok(body.indexOf('What to wear') < body.indexOf('Important: Waiver Required'), 'notice is lower than info');
  assert.ok(!body.includes('Your host'), 'the host section is gone (E4)');
  assert.ok(body.includes(party.notices[0].text));
  assert.equal([...html.matchAll(/<form\b/g)].length, 1, 'the RSVP form (E2)');
  // E2: JSON-LD plus the one RSVP client script (rsvp.test.ts counts it).
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].filter((m) => !/application\/ld\+json/.test(m[1]));
  assert.equal(scripts.length, 1, 'one non-JSON-LD script');
});

test('9c. built page: header alt, description, section order (E4)', { skip: skipBuilt }, () => {
  const html = page();
  const hero = html.match(/<section\b[\s\S]*?<\/section>/)![0];
  const img = hero.match(/<img\b[^>]*>/)![0];
  assert.equal(attr(img, 'alt'), party.graphics.alt);

  const variant = site.licensed ? 1 : 0;
  const body = text(html);
  for (const p of party.description!) assert.ok(body.includes(plainText(p, variant)), `description paragraph missing: ${plainText(p, variant).slice(0, 50)}`);
  if (site.licensed) assert.ok(body.includes('passed his state test to become a licensed neuromuscular massage therapist! 🎉'));

  const at = (re: RegExp) => html.search(re);
  const order = [
    at(/A year and a half ago/),
    at(/<h2\b[^>]*>Schedule<\/h2>/),
    at(/<h2\b[^>]*>What to wear<\/h2>/),
    at(/id="rsvp"/),
    at(/Important: Waiver Required/),
    at(/This event made possible by…/),
  ];
  assert.ok(order.every((n) => n > 0), `a section is missing: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'description, schedule, info, RSVP, notice, credits in that order');
  assert.ok(!html.includes('Your host'));
  assert.ok(!/Own day pass required|Mats provided, own mats welcome/.test(html));
});

test('9d. built page: links open in a new tab; four credits in order with images', { skip: skipBuilt }, () => {
  const html = page();
  const links = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  for (const href of ['https://www.instagram.com/brittandspirit/', 'https://climbcityrock.com/day-passes']) {
    const a = links.find((l) => attr(l, 'href') === href);
    assert.ok(a, `link ${href}`);
    assert.equal(attr(a!, 'target'), '_blank');
    assert.match(attr(a!, 'rel')!, /noopener/);
  }

  const credits = [...html.matchAll(/<a\b[^>]*class="[^"]*\bcredit\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(credits.length, 4);
  const want = ['Maréa, host', 'CityROCK, venue space donated', 'Britt Maddy, yoga class generously provided', 'JohnMark, graphic design'];
  credits.forEach((m, i) => {
    const item = party.credits!.items[i];
    assert.equal(attr(m[0], 'href'), item.url);
    assert.equal(attr(m[0], 'target'), '_blank');
    assert.match(attr(m[0], 'rel')!, /noopener/);
    assert.equal(text(m[1]).replace(/ ,/g, ','), want[i], `credit ${i} text`);
    const img = m[1].match(/<img\b[^>]*>/)?.[0];
    assert.ok(img, `credit ${i} image`);
    assert.ok(attr(img!, 'width') && attr(img!, 'height'), `credit ${i} width and height`);
    // the build minifies alt="" to a bare `alt`
    const alt = attr(img!, 'alt') ?? (/\salt(\s|>|\/)/.test(img!) ? '' : undefined);
    assert.equal(alt, item.alt, `credit ${i} alt`);
  });
  assert.match(html, /<h2\b[^>]*>This event made possible by…<\/h2>/);
});

test('9e. other pages keep the default preview; sitemap; feed; ics', { skip: skipBuilt }, () => {
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.equal(meta(home, 'og:image:width'), '1200');
  assert.equal(meta(home, 'og:image:height'), '630');
  assert.equal(meta(home, 'og:image:alt'), undefined);
  assert.ok(!readFileSync(join(dist, 'sitemap.xml'), 'utf8').includes('launch-party'));
  const feed = JSON.parse(readFileSync(join(dist, 'events/launch-party.json'), 'utf8'));
  assert.deepEqual(feed, JSON.parse(JSON.stringify(feedFor(party, siteUrl))));
  const ics = readFileSync(join(dist, 'events/launch-party.ics'), 'utf8');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20261122T210000Z'));
});
