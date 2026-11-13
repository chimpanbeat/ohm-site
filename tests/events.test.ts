import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAnalyticsScript } from './fixtures/analytics-scripts.ts';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { site } from '../src/data/site.ts';
import { w, wording } from '../src/data/wording.ts';
import { events, rsvpText, launchParty, eventBySlug, eventHeadings, eventsAt, CHAI_AT, CHAI_NOTE, SESSION_LIMIT } from '../src/data/events.ts';
import type { SiteEvent } from '../src/data/events.ts';
import {
  RESERVED_SLUGS,
  assertEvent,
  assertEvents,
  dateLabel,
  timeLabel,
  mapsUrl,
  icsFor,
  googleCalUrl,
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

// `live` is what this build serves (the chai version from 23:00 UTC on Nov 22, 2026); `party` is always the pre-swap data (E8, I-091)
const live = events.find((e) => e.slug === 'launch-party')!;
const party = launchParty(SESSION_LIMIT, null);
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
        'Restorative Yoga with Britt 🧘 🪷', // E8, I-088
        ['No supplies or experience needed', 'Mats provided, or bring your own', 'Water bottle and stretchy clothes recommended', 'Limited to first 20 sign-ups'],
        false,
      ],
      [
        'Self Care-Themed Launch Party 🎉',
        ['Open house style, come and go as you please', 'Refreshments provided', 'Activities and merch', 'Tai Chi led by John Marshall ☯️ 🥋'], // E8, I-088
        false,
      ],
      ['Optional: climb at the gym until close 🧗🏼‍♀️', ['Day pass purchase required', 'Harness and shoe rentals available'], true], // E5, I-086
    ],
  );
  assert.deepEqual(party.timeline[3].notes![0], [{ text: 'Day pass purchase required', href: 'https://climbcityrock.com/day-passes' }]);

  // E4, I-079: "This event made possible by…" (Marea's labels)
  assert.deepEqual(party.credits, {
    heading: 'This event made possible by…',
    items: [
      { name: 'Maréa', role: 'Host', url: 'https://dreamcatcherwed.com', image: 'launch-party/marea-thumb.jpg', alt: '' },
      { name: 'CityROCK', role: 'Venue', url: 'https://climbcityrock.com', image: 'launch-party/cityrock-logo.png', alt: '', logo: true },
      { name: 'Britt Maddy', role: 'Yoga instruction', url: 'https://www.instagram.com/brittandspirit/', image: 'launch-party/britt-thumb.jpg', alt: '' },
      { name: 'John-Mark', role: 'Brand design', url: 'https://johnmark.co', image: 'launch-party/johnmark-logo.png', alt: 'Rantala Creative', logo: true },
      { name: 'John Marshall', role: 'Tai Chi instruction', url: 'https://ransfordengineering.com', image: 'launch-party/john-thumb.jpg', alt: '' }, // E8, I-089
    ],
  }); // E5, I-085: roles on their own line, capitalised; the two logos are transparent (logo: true)
  assert.deepEqual(eventHeadings, { description: 'Description', schedule: 'Schedule', details: 'Details' }); // E5, I-085
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
  assert.equal(plainText(parking.text!, 1), "Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks."); // E8, I-093: Rich now
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
  // E5, I-086: the Tai Chi note stays last in the party item whatever the limit
  for (const n of [12, 20]) {
    const notes = launchParty(n).timeline[2].notes!.map((x) => plainText(x, 1));
    assert.equal(notes[notes.length - 1], 'Tai Chi led by John Marshall ☯️ 🥋');
    assert.equal(notes[notes.length - 2], 'Activities and merch');
  }
  assert.equal(eventBySlug('launch-party'), live);
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

test('1f. credit logos are transparent RGBA PNGs of the sizes the page expects (E5, I-085)', () => {
  const header = (name: string) => {
    const b = readFileSync(join(root, 'src/assets/events/launch-party', name));
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), colourType: b[25] };
  };
  assert.deepEqual(header('cityrock-logo.png'), { width: 385, height: 112, colourType: 6 });
  assert.deepEqual(header('johnmark-logo.png'), { width: 456, height: 112, colourType: 6 });
  for (const c of party.credits!.items) assert.ok(existsSync(join(root, 'src/assets/events', c.image)), c.image);
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
  for (const n of [...names, 'events', '_astro', 'index', '404', 'body-map']) assert.ok(RESERVED_SLUGS.includes(n), `RESERVED_SLUGS lacks "${n}"`); // B4: /body-map
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
  assert.ok(lines.includes(`URL:${origin}${base}/events/launch-party`)); // E8, I-092

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
  assert.equal(real[0].props.event, live);
  const two = eventPaths([...events, synthetic]);
  assert.deepEqual(two.map((p) => p.params.event), ['launch-party', 'summer-yoga']);
  assert.throws(() => feedFor(synthetic, siteUrl), /rsvp/);
  assert.throws(() => eventPaths([...events, { ...synthetic, slug: 'launch-party' }]), /duplicate/);
});

test('7. feed', () => {
  const feed = feedFor(party, siteUrl);
  assert.deepEqual(Object.keys(feed).sort(), [
    'bookUrl', 'closesAt', 'dateLabel', 'end', 'googleCalUrl', 'icsUrl', 'mail', 'maxGuests', 'notices', 'pageUrl', 'reminderAt', 'reminderInfo',
    'sender', 'session', 'signature', 'slug', 'start', 'text', 'timeLabel', 'tips', 'title', 'v', 'venue',
  ]);
  assert.equal(feed.v, 1);
  assert.equal(feed.slug, 'launch-party');
  assert.equal(feed.dateLabel, 'Sunday, Nov 22, 2026');
  assert.equal(feed.timeLabel, '2:00–6:00 pm');
  assert.equal(feed.pageUrl, `${origin}${base}/events/launch-party`); // E8, I-092
  assert.equal(feed.icsUrl, `${origin}${base}/events/launch-party.ics`);
  assert.deepEqual(feed.session, { key: 'yoga', label: 'Yoga', limit: 20, waitlist: true, time: '2–3 pm' });
  assert.deepEqual(feed.reminderInfo.map((b) => b.title), ['What to wear', 'Parking']);
  assert.deepEqual(feed.notices, [{ title: party.notices[0].title, text: party.notices[0].text, url: party.notices[0].link!.url, urlLabel: party.notices[0].link!.label }]);
  assert.deepEqual(feed.sender, { name: site.name, from: site.eventsEmail, replyTo: site.eventsEmail, contact: site.email });
  assert.notEqual(site.eventsEmail, site.email);
  assert.equal(feed.text, rsvpText);
  assert.equal(feed.tips, true, 'E6: the launch party has tips');
  assert.equal(feedFor({ ...party, rsvp: { ...party.rsvp!, tips: undefined } }, siteUrl).tips, false, 'no rsvp.tips: false');
  assert.equal(feedFor({ ...party, rsvp: { ...party.rsvp!, tips: false } }, siteUrl).tips, false);
  const json = JSON.stringify(feed);
  assert.ok(!('showGoing' in feed) && !json.includes('showGoing'));
  assert.deepEqual(json.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)!.sort(), [site.email, site.eventsEmail, site.eventsEmail].sort(), 'the only addresses');
});

test('7b. feed (E13): the book link, the event words for the emails, the signature, and no phone number', () => {
  const feed = feedFor(party, siteUrl);
  assert.equal(feed.bookUrl, `${origin}${base}/book`);
  assert.deepEqual(feed.mail, { name: 'Ohm Launch Party', thanks: "I'm looking forward to celebrating this milestone moment with you.", host: 'Maréa' });
  assert.deepEqual(feed.signature, { name: 'Brian Clarke', credentials: 'LMT, CNMT', business: site.name, url: origin, label: 'ohmprecisionbodywork.com' });
  assert.equal(`${feed.signature.name}, ${feed.signature.credentials}`, w('credential'), 'the signature line is the credential');
  assert.equal(feed.signature.name, site.owner);
  assert.equal(wording.credential[1], `${site.owner}, ${wording.postNominals[1]}`);
  assert.equal(wording.postNominals[0], '', 'unlicensed: no letters after the name');
  // defaults for an event without rsvp.mail
  const bare = feedFor({ ...party, rsvp: { ...party.rsvp!, mail: undefined } }, siteUrl);
  assert.deepEqual(bare.mail, { name: party.title, thanks: '', host: '' });
  const json = JSON.stringify(feed);
  assert.ok(!/\(?\b[2-9]\d{2}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(json) && !/tel:|PHONE/.test(json), 'no phone number or phone property in the feed');
  // the new copy keys, and the sign-off is gone (the signature replaces it)
  for (const k of ['detailsHead', 'yourRsvp', 'guestsHead', 'guestLine', 'sessionAnswer', 'sessionWaitlist', 'bookHead', 'bookLink', 'calendarGoogleLine', 'changeConfirming', 'questions', 'questionsHost', 'seeYou']) {
    assert.ok(k in feed.text, `text.${k}`);
  }
  assert.ok(!('signoff' in feed.text) && !('guestRsvp' in feed.text));
});

test('7c. feed (E14): the Google Calendar link carries the same title, time, place and page as the .ics', () => {
  const feed = feedFor(party, siteUrl);
  const url = new URL(feed.googleCalUrl);
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), party.title);
  assert.equal(url.searchParams.get('dates'), '20261122T210000Z/20261123T010000Z'); // 2–6 pm MST
  assert.equal(url.searchParams.get('location'), `${party.venue.name}, ${party.venue.address}`);
  assert.equal(url.searchParams.get('details'), feed.pageUrl);
  assert.equal(googleCalUrl(party, siteUrl), feed.googleCalUrl);
  assert.ok(new URL(feed.googleCalUrl).origin === 'https://calendar.google.com' && !/office/i.test(feed.googleCalUrl));
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
    let src = readFileSync(f, 'utf8');
    // I-147: a UTM campaign value in the printed short links is an analytics tag (docs/runbooks/analytics.md), not an event fact.
    if (f.replace(/\\/g, '/').endsWith('src/data/analytics.ts')) src = src.replaceAll('utm_campaign=launch-party', '');
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
  for (const decl of ['aspect-ratio: 31 / 10', 'object-fit: cover', 'object-position: 50% 50%']) {
    assert.ok(wide.includes(decl), `wide block has ${decl}`);
  }
  for (const gone of ['11 / 4', '1.5152', 'max-width: 60rem']) assert.ok(!hero.includes(gone), `E5 removed ${gone} from the hero`); // I-085: fills the column
  assert.ok(hero.includes('alt={event.graphics.alt}'), 'the header graphic has its alt');
  assert.ok(hero.includes('event.heading ?? event.title'), 'the H1 is heading ?? title');

  // E5 (I-085): credits show the role on its own line; logos are unframed; headings come from the data
  const credits = comp('EventCredits.astro');
  for (const token of ['credit__role', 'var(--fs-small)', 'credit__img--photo']) assert.ok(credits.includes(token), `credits has ${token}`);
  assert.ok(!credits.includes('</strong>,'), 'no comma between name and role');
  for (const [file, src] of [['EventTimeline.astro', comp('EventTimeline.astro')], ['EventDescription.astro', comp('EventDescription.astro')], ['[event].astro', readFileSync(join(root, 'src/pages/events/[event].astro'), 'utf8')]] as const) {
    for (const word of ['Schedule', 'Description', 'Details']) assert.ok(!src.includes(`>${word}<`), `${file} types ${word}`);
  }
  const info = comp('EventInfo.astro');
  assert.ok(info.includes('<h3>') && !info.includes('<h2>'), 'EventInfo uses an H3');

  // check:contrast knows the notice's link pair
  assert.match(readFileSync(join(root, 'scripts/check-contrast.mjs'), 'utf8'), /green-700 \(link on light\)/);
});

// Built output. Skipped with a reason when the site hasn't been built.
const built = existsSync(join(dist, 'events/launch-party.html'));
const skipBuilt = built ? false : 'dist/events/launch-party.html is missing; run `npm run build` first';
const page = () => readFileSync(join(dist, 'events/launch-party.html'), 'utf8');
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const meta = (html: string, key: string, name = 'property') =>
  attr(html.match(new RegExp(`<meta\\b[^>]*\\b${name}="${key}"[^>]*>`))?.[0] ?? '', 'content');

test('9a. built page: head', { skip: skipBuilt }, () => {
  const html = page();
  assert.equal(text(html.match(/<h1\b[\s\S]*?<\/h1>/)![0]), 'A Celebration of Self-Care'); // E4: the graphic says the rest
  assert.match(html, /<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/);
  assert.match(html, new RegExp(`<link\\b[^>]*\\brel="canonical"[^>]*\\bhref="${origin}${base}/events/launch-party"`));
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
  assert.ok(!hero.includes('href="#rsvp"'), 'Brian, Nov 9: no RSVP button in the hero (the floating bar and the form are enough)');

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
  // E2: JSON-LD plus the RSVP client script; E10 adds client script 6 (event.ts).
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].filter((m) => !/application\/ld\+json/.test(m[1]) && !isAnalyticsScript(m[1]));
  assert.equal(scripts.length, 2, 'two non-JSON-LD scripts');
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
    at(/<h2\b[^>]*>Description<\/h2>/),
    at(/A year and a half ago/),
    at(/<h2\b[^>]*>Schedule<\/h2>/),
    at(/<h2\b[^>]*>Details<\/h2>/),
    at(/<h3\b[^>]*>What to wear<\/h3>/),
    at(/id="rsvp"/),
    at(/Important: Waiver Required/),
    at(/This event made possible by…/),
  ];
  assert.ok(order.every((n) => n > 0), `a section is missing: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'description, schedule, details, RSVP, notice, credits in that order');
  assert.ok(!html.includes('Your host'));
  assert.ok(!/Own day pass required|Mats provided, own mats welcome|Harness and shoes provided/.test(html));
});

test('9c2. built page: heading outline and schedule notes (E5)', { skip: skipBuilt }, () => {
  const html = page();
  const main = html.match(/<main\b[\s\S]*?<\/main>/)![0];
  const heads = [...main.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({ level: Number(m[1]), text: text(m[2]) }));
  const h2s = heads.filter((h) => h.level === 2).map((h) => h.text);
  assert.deepEqual(h2s, ['Description', 'Schedule', 'Details', 'RSVP', 'Important: Waiver Required', 'This event made possible by…']);
  const between = (a: string, b: string) => {
    const i = heads.findIndex((h) => h.level === 2 && h.text === a);
    const j = heads.findIndex((h) => h.level === 2 && h.text === b);
    return heads.slice(i + 1, j).filter((h) => h.level === 3).map((h) => h.text);
  };
  assert.deepEqual(between('Schedule', 'Details'), party.timeline.map((i) => i.title));
  assert.deepEqual(between('Details', 'RSVP'), ['What to wear', 'Parking', 'Raffle']);
  heads.forEach((h, i) => {
    if (i > 0) assert.ok(h.level <= heads[i - 1].level + 1, `heading "${h.text}" skips a level`);
  });

  const ol = html.match(/<ol\b[^>]*class="[^"]*\btimeline\b[^"]*"[\s\S]*?<\/ol>/)![0];
  const lists = [...ol.matchAll(/<ul\b[^>]*>([\s\S]*?)<\/ul>/g)].map((m) => [...m[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((x) => text(x[1])));
  const partyList = lists.find((l) => l.includes('Activities and merch'))!;
  // E8, I-088/I-091: the Tai Chi note, or from 23:00 UTC on Nov 22 the chai note; one version, never both
  const bullet = partyList[partyList.indexOf('Activities and merch') + 1];
  assert.ok(bullet === 'Tai Chi led by John Marshall ☯️ 🥋' || bullet === CHAI_NOTE, bullet);
  assert.ok(lists.some((l) => l.includes('Harness and shoe rentals available')));
});

test('9d. built page: links open in a new tab; five credits in order with images', { skip: skipBuilt }, () => {
  const html = page();
  const links = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  for (const href of ['https://www.instagram.com/brittandspirit/', 'https://climbcityrock.com/day-passes']) {
    const a = links.find((l) => attr(l, 'href') === href);
    assert.ok(a, `link ${href}`);
    assert.equal(attr(a!, 'target'), '_blank');
    assert.match(attr(a!, 'rel')!, /noopener/);
  }

  const credits = [...html.matchAll(/<a\b[^>]*class="[^"]*\bcredit\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(credits.length, 5); // E8, I-089
  const want = ['Maréa Host', 'CityROCK Venue', 'Britt Maddy Yoga instruction', 'John-Mark Brand design', `John Marshall ${live.credits!.items[4].role}`];
  credits.forEach((m, i) => {
    const item = live.credits!.items[i];
    assert.equal(attr(m[0], 'href'), item.url);
    assert.equal(attr(m[0], 'target'), '_blank');
    assert.match(attr(m[0], 'rel')!, /noopener/);
    assert.equal(text(m[1]), want[i], `credit ${i} text`);
    assert.ok(!text(m[1]).includes(','), `credit ${i} has no comma`);
    assert.match(m[1], new RegExp(`<strong\\b[^>]*class="[^"]*credit__name[^"]*"[^>]*>${item.name}</strong>`), `credit ${i} name`);
    assert.match(m[1], new RegExp(`class="[^"]*credit__role[^"]*"[^>]*>${item.role}<`), `credit ${i} role`);
    const img = m[1].match(/<img\b[^>]*>/)?.[0];
    assert.ok(img, `credit ${i} image`);
    assert.equal(/credit__img--photo/.test(img!), !item.logo, `credit ${i} photo frame only on photos`);
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
  assert.deepEqual(feed, JSON.parse(JSON.stringify(feedFor(live, siteUrl))));
  const ics = readFileSync(join(dist, 'events/launch-party.ics'), 'utf8');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20261122T210000Z'));
});

// ---- E8 (I-088 to I-093) ------------------------------------------------------------------------------------------
const codePoints = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16).toUpperCase());

test('E8-1. data: the yoga title, the Tai Chi note, John Marshall, the photo', () => {
  const p = launchParty(20);
  assert.equal(p.timeline[1].title, 'Restorative Yoga with Britt 🧘 🪷');
  const notes = p.timeline[2].notes!.map((n) => plainText(n, 1));
  assert.equal(notes[notes.length - 1], 'Tai Chi led by John Marshall ☯️ 🥋');
  assert.equal(notes[notes.length - 2], 'Activities and merch');
  assert.deepEqual(codePoints(notes[notes.length - 1]).slice(-4), ['262F', 'FE0F', '20', '1F94B']);
  assert.deepEqual(p.credits!.items.slice(0, 4), party.credits!.items.slice(0, 4));
  assert.equal(p.credits!.items.length, 5);
  assert.deepEqual(p.credits!.items[4], { name: 'John Marshall', role: 'Tai Chi instruction', url: 'https://ransfordengineering.com', image: 'launch-party/john-thumb.jpg', alt: '' });
  assert.ok(!('logo' in p.credits!.items[4]), 'a framed photo, not a logo');
  // john-thumb.jpg: a 112x112 JPEG like the other photos
  const b = readFileSync(join(root, 'src/assets/events/launch-party/john-thumb.jpg'));
  assert.deepEqual([b[0], b[1]], [0xff, 0xd8]);
  let i = 2;
  let size: [number, number] | undefined;
  while (i < b.length) {
    assert.equal(b[i], 0xff);
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      size = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; // width, height
      break;
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  assert.deepEqual(size, [112, 112]);
});

test('E8-2. the event-day swap: both versions, the clock, the switch', () => {
  assert.equal(CHAI_NOTE, 'Chai tea by John Marshall 🍵🫖');
  assert.deepEqual(codePoints(CHAI_NOTE!).slice(-2), ['1F375', '1FAD6']);
  assert.equal(new Date(CHAI_AT).toISOString(), '2026-11-22T23:00:00.000Z');
  const tai = launchParty(20, null);
  const chai = launchParty(20, CHAI_NOTE);
  assert.doesNotThrow(() => assertEvent(tai));
  assert.doesNotThrow(() => assertEvent(chai));
  // only item 2's last note and John Marshall's role differ
  const expected = structuredClone(tai);
  expected.timeline[2].notes![expected.timeline[2].notes!.length - 1] = CHAI_NOTE!;
  expected.credits!.items[4].role = 'Chai Tea ceremony';
  assert.deepEqual(chai, expected);
  assert.notDeepEqual(chai, tai);
  assert.deepEqual(launchParty(20), tai, 'no second argument = the Tai Chi version');

  // the clock: one millisecond either side, then back (no shared mutation)
  const at = Date.parse(CHAI_AT);
  const before = eventsAt(at - 1);
  assert.deepEqual(before, [tai]);
  assert.deepEqual(eventsAt(at), [chai]);
  assert.deepEqual(eventsAt(at + 3_600_000), [chai]);
  assert.deepEqual(eventsAt(at - 1), before);
  assert.deepEqual(eventsAt(at - 86_400_000), [tai]);

  // build time: OHM_EVENTS_NOW (an unparseable value stops the build)
  const run = (now: string) =>
    spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `import { events } from ${JSON.stringify(pathToFileURL(join(root, 'src/data/events.ts')).href)}; console.log(JSON.stringify(events[0].timeline[2].notes.at(-1)))`],
      { env: { ...process.env, OHM_EVENTS_NOW: now }, encoding: 'utf8' },
    );
  const bad = run('nonsense');
  assert.notEqual(bad.status, 0, 'an unparseable OHM_EVENTS_NOW throws');
  const swapped = run('2026-11-22T23:30:00Z');
  assert.equal(swapped.status, 0, swapped.stderr);
  assert.equal(JSON.parse(swapped.stdout), CHAI_NOTE);
  const early = run('2026-11-22T22:59:59Z');
  assert.equal(early.status, 0, early.stderr);
  assert.equal(JSON.parse(early.stdout), 'Tai Chi led by John Marshall ☯️ 🥋');
});

test('E8-3. the parking text links four words; the feed and the email line stay plain', () => {
  const plain = "Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks.";
  const info = party.info[1];
  assert.equal(info.id, 'parking');
  assert.equal(plainText(info.text!, 0), plain);
  assert.equal(plainText(info.text!, 1), plain);
  assert.deepEqual(info.text, ['Metered street parking, or ', { text: 'free parking along Wahsatch', href: 'https://maps.app.goo.gl/kdJ5A88ab9EMxUmQ8' }, " if you don't mind walking 2 blocks."]);
  const feed = feedFor(party, siteUrl);
  assert.deepEqual(feed.reminderInfo[1], { title: 'Parking', text: plain });
  assert.equal(typeof feed.reminderInfo[1].text, 'string');
  // the guards run over info text too
  const http = clone();
  http.info[1].text = ['see ', { text: 'here', href: 'http://example.com' }];
  assert.throws(() => assertEvent(http), /must be https/);
  const key = clone();
  key.info[1].text = ['x', { w: 'nope' }];
  assert.throws(() => assertEvent(key), /unknown wording key/);
});

test('E8-4. URLs: the page lives under /events', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  assert.equal(feedFor(party, siteUrl).pageUrl, `${origin}${base}/events/launch-party`);
  assert.ok(icsFor(party, siteUrl, now).split('\r\n').includes(`URL:${origin}${base}/events/launch-party`));
  assert.deepEqual(eventPaths(events).map((x) => x.params.event), ['launch-party']);
  assert.deepEqual(eventPaths([...events, synthetic]).map((x) => x.params.event), ['launch-party', 'summer-yoga']);
  assert.ok(existsSync(join(root, 'src/pages/events/[event].astro')));
  assert.ok(!existsSync(join(root, 'src/pages/[event].astro')), 'the old route is gone');
  const config = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
  assert.match(config, /redirects/);
  assert.match(config, /\/events\/\$\{e\.slug\}/);
  assert.match(readFileSync(join(root, 'src/pages/sitemap.xml.ts'), 'utf8'), /`\/events\/\$\{e\.slug\}`/);
});

test('E8-5. built: the page under /events, the redirect page, one parking link, one version', { skip: skipBuilt }, () => {
  const html = page();
  assert.match(html, new RegExp(`<link\\b[^>]*\\brel="canonical"[^>]*\\bhref="${origin}${base}/events/launch-party"`));
  assert.match(html, /<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/);
  const parking = html.match(/<div\b[^>]*\bid="parking"[\s\S]*?<\/div>/)![0];
  const links = [...parking.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(links.length, 1);
  assert.equal(attr(links[0][0], 'href'), 'https://maps.app.goo.gl/kdJ5A88ab9EMxUmQ8');
  assert.equal(attr(links[0][0], 'target'), '_blank');
  assert.match(attr(links[0][0], 'rel')!, /noopener/);
  assert.equal(text(links[0][1]), 'free parking along Wahsatch');
  const para = parking.match(/<p\b[\s\S]*?<\/p>/)![0];
  assert.equal(text(para), "Metered street parking, or free parking along Wahsatch if you don't mind walking 2 blocks.");

  // the redirect page
  const redirect = readFileSync(join(dist, 'launch-party.html'), 'utf8');
  assert.match(redirect, /<meta\b[^>]*\bhttp-equiv="refresh"[^>]*\bcontent="0;url=\/events\/launch-party"/);
  assert.match(redirect, /<meta\b[^>]*\bname="robots"[^>]*\bcontent="noindex"/);
  assert.match(redirect, new RegExp(`<link\\b[^>]*\\brel="canonical"[^>]*\\bhref="${origin}${base}/events/launch-party"`));
  assert.ok(!/<script\b/.test(redirect), 'no script');
  assert.ok(!/<main\b/.test(redirect), 'no page content');
  assert.ok(!readFileSync(join(dist, 'sitemap.xml'), 'utf8').includes('launch-party'));

  // either version, never mixed (the deploy job tests a build that may straddle 23:00 UTC)
  const body = text(html);
  const tai = body.includes('Tai Chi led by John Marshall ☯️ 🥋') && body.includes('John Marshall Tai Chi instruction');
  const chai = body.includes('Chai tea by John Marshall 🍵🫖') && body.includes('John Marshall Chai Tea ceremony');
  assert.ok(tai !== chai, 'exactly one version');
  if (tai) assert.ok(!body.includes('Chai') && !body.includes('chai'));
  else assert.ok(!body.includes('Tai Chi'));
  assert.ok(body.includes('Restorative Yoga with Britt 🧘 🪷'));
});

test('E8-6. deploy.yml: the three Nov 22 runs, the year guard, the usual triggers', () => {
  const y = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.match(y, /I-091/);
  const sched = y.match(/^ {2}schedule:\n((?: {4}.*\n)+)/m)?.[1] ?? '';
  assert.deepEqual([...sched.matchAll(/cron:\s*'([^']+)'/g)].map((m) => m[1]), ['7 23 22 11 *', '22 23 22 11 *', '45 23 22 11 *']);
  assert.match(y, /^ {2}push:\n {4}branches: \[main\]/m);
  assert.match(y, /^ {2}workflow_dispatch:/m);
  const job = (name: string) => y.match(new RegExp(`^ {2}${name}:\\n((?: {4}.*\\n|\\n)+)`, 'm'))?.[1] ?? '';
  const gate = job('gate');
  assert.ok(gate, 'a gate job');
  assert.match(gate, /id:\s*y\b/);
  assert.match(gate, /github\.event_name/i);
  assert.match(gate, /date -u \+%Y/);
  assert.match(gate, /2026/);
  assert.match(gate, /go=(true|false)/);
  assert.match(gate, /GITHUB_OUTPUT/);
  assert.match(gate, /outputs:\n\s+go: \$\{\{ steps\.y\.outputs\.go \}\}/);
  const build = job('build');
  assert.match(build, /needs: gate/);
  assert.match(build, /if: needs\.gate\.outputs\.go == 'true'/);
  assert.match(job('deploy'), /needs: build/);
  // the guard's shell logic, run for real: a schedule run outside 2026 says no; push, dispatch and 2026 say yes
  const step = gate.match(/run: \|\n((?: {10}.*\n)+)/)?.[1].replace(/^ {10}/gm, '');
  assert.ok(step, 'the gate step has a script');
  const decide = (event: string, year: string) => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-'));
    const out = join(dir, 'out');
    writeFileSync(out, '');
    // `$(date -u +%Y)` is replaced by a fixed year so the 2027 case can run today
    const script = step!.replace(/\$\(date -u \+%Y\)/g, year).replace(/\$\{\{ github\.event_name \}\}/g, event);
    const r = spawnSync('bash', ['-c', script], { env: { ...process.env, GITHUB_OUTPUT: out }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return readFileSync(out, 'utf8').trim();
  };
  assert.equal(decide('schedule', '2026'), 'go=true');
  assert.equal(decide('schedule', '2027'), 'go=false');
  assert.equal(decide('push', '2027'), 'go=true');
  assert.equal(decide('workflow_dispatch', '2027'), 'go=true');
});

// ---- E10 (I-097, I-098, I-100, I-101, I-102): the floating RSVP bar, entrance, timeline, countdown, credit lift.
const src = (p: string) => readFileSync(join(root, p), 'utf8');

test('E10-3a. dist: the RSVP bar sits hidden after the hero and before #rsvp, three buttons with the existing labels', { skip: skipBuilt }, () => {
  const html = page();
  const bars = html.match(/<div\b[^>]*class="[^"]*\brsvp-bar\b[^"]*"[^>]*>/g) ?? [];
  assert.equal(bars.length, 1, 'one bar');
  const open = bars[0];
  assert.match(open, /\bhidden\b/);
  assert.equal(attr(open, 'role'), 'group');
  assert.equal(attr(open, 'aria-label'), rsvpText.status);
  const iBar = html.indexOf(open);
  const bar = html.slice(iBar, html.indexOf('</div>', iBar));
  const buttons = [...bar.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.deepEqual(
    buttons.map((m) => [attr(m[1], 'type'), attr(m[1], 'data-status'), text(m[2])]),
    [
      ['button', 'going', rsvpText.going],
      ['button', 'maybe', rsvpText.maybe],
      ['button', 'cant', rsvpText.cant],
    ],
  );
  const heroEnd = html.indexOf('</section>');
  assert.ok(iBar > heroEnd, 'after the hero section');
  assert.ok(iBar < html.indexOf('id="rsvp"'), 'before the RSVP section');
});

test('E10-3b. dist: every timeline item has data-start and data-end', { skip: skipBuilt }, () => {
  const ol = page().match(/<ol\b[^>]*class="[^"]*\btimeline\b[^"]*"[\s\S]*?<\/ol>/)![0];
  const lis = [...ol.matchAll(/<li\b([^>]*\btimeline__item\b[^>]*)>/g)].map((m) => m[1]);
  assert.equal(lis.length, 4);
  const starts = lis.map((l) => attr(l, 'data-start'));
  const ends = lis.map((l) => attr(l, 'data-end'));
  assert.ok(starts.every(Boolean) && ends.every(Boolean), 'all four carry both');
  assert.equal(ends[0], starts[1], 'item 0 ends where item 1 starts');
  assert.equal(ends[3], '2026-11-22T20:00:00-07:00');
});

test('E10-3c. dist: the countdown line carries the zone and the three strings (when the build is before the event ends)', { skip: skipBuilt }, () => {
  const html = page();
  const tag = html.match(/<p\b[^>]*class="[^"]*\bevent-countdown\b[^"]*"[^>]*>/)?.[0];
  if (Date.now() >= Date.parse(live.end)) {
    assert.equal(tag, undefined, 'no countdown in a build made after the event');
    return;
  }
  assert.ok(tag, 'the countdown paragraph');
  assert.equal(attr(tag, 'data-tz'), 'America/Denver');
  const data = JSON.parse((attr(tag, 'data-text') ?? '').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&'));
  assert.deepEqual(data, { days: rsvpText.countdownDays, tomorrow: rsvpText.countdownTomorrow, today: rsvpText.countdownToday });
  const p = html.slice(html.indexOf(tag), html.indexOf('</p>', html.indexOf(tag)));
  assert.equal(text(p), '', 'the static build never shows a number');
});

test('E10-3d. dist: exactly five .rise elements, each a section container, none in the first section', { skip: skipBuilt }, () => {
  const html = page();
  const sections = [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0]);
  const riseIn = (s: string) => [...s.matchAll(/<div\b[^>]*class="([^"]*)"/g)].filter((m) => /(^|\s)rise(\s|$)/.test(m[1]));
  assert.equal(riseIn(html).length, 5);
  assert.equal(riseIn(sections[0]).length, 0, 'not the hero section');
  for (const s of sections.slice(1)) {
    const hits = riseIn(s);
    assert.equal(hits.length, 1, 'one per later section');
    assert.match(hits[0][1], /\bcontainer\b/);
  }
});

test('E10-4. source: credit lift, timeline dots and segments, bar position, client script 6 imports and requests', () => {
  const credits = src('src/components/events/EventCredits.astro');
  assert.match(credits, /\.credit:hover,\s*\.credit:focus-visible\s*\{[^}]*box-shadow:\s*var\(--shadow-lift\)/);
  const motion = credits.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n  \}/);
  assert.ok(motion, 'a no-preference block');
  assert.match(motion[1], /translate:\s*0 -2px/);
  assert.equal((credits.match(/translate:\s*0 -2px/g) ?? []).length, 1, 'the translate is only inside the block');

  const timeline = src('src/components/events/EventTimeline.astro');
  assert.match(timeline, /border-radius:\s*50%/);
  assert.match(timeline, /:has\(\+ \.timeline__item--optional\)[^{]*\{[^}]*dashed/);
  assert.doesNotMatch(timeline, /\.timeline\s*\{[^}]*border-left/);

  const bar = src('src/components/events/RsvpBar.astro');
  assert.match(bar, /position:\s*fixed/);
  assert.match(bar, /scroll-padding-bottom/);

  const script = src('src/scripts/event.ts');
  const imports = [...script.matchAll(/^import\b[^;]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['../lib/event-time.ts']);
  assert.doesNotMatch(script, /\bfetch\b|localStorage|sessionStorage|document\.cookie/);
});

// E11 (I-104): sharper desktop banner
const bannerDir = join(root, 'src/assets/events/launch-party');
test('11a. banner outputs', () => {
  const png = readFileSync(join(bannerDir, 'banner-bg.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1240);
  assert.equal(png.readUInt32BE(20), 400);
  assert.equal(png[25], 2, 'colour type 2 (RGB)');
  const raw = readFileSync(join(bannerDir, 'banner-mark.json'), 'utf8');
  assert.ok(Buffer.byteLength(raw) <= 40 * 1024, 'banner-mark.json is at most 40 KB');
  const j = JSON.parse(raw);
  assert.equal(j.viewBox, '0 0 694 203');
  for (const k of ['left', 'top', 'width', 'height']) assert.ok(typeof j.box[k] === 'number' && j.box[k] > 0 && j.box[k] < 100, `box.${k}`);
  for (const k of ['accent', 'light']) assert.ok(j[k].startsWith('M') && j[k].includes('Z'), `${k} path`);
  assert.ok(!/NaN/.test(raw), 'no NaN');
  assert.ok(!/\d\.\d{2,}/.test(j.accent + j.light), 'path numbers have at most one decimal');
});

test('11b. banner script is deterministic', () => {
  const run = () => {
    const out = mkdtempSync(join(tmpdir(), 'banner-'));
    const r = spawnSync(process.execPath, ['scripts/make-event-banner.mjs', '--out', out], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return out;
  };
  const a = run();
  const b = run();
  for (const n of ['banner-bg.png', 'banner-mark.json']) assert.ok(readFileSync(join(a, n)).equals(readFileSync(join(b, n))), `${n} is byte-identical across runs`);
  assert.equal(readFileSync(join(a, 'banner-mark.json'), 'utf8'), readFileSync(join(bannerDir, 'banner-mark.json'), 'utf8'));
});

test('11c. banner data and hero source', () => {
  assert.equal(party.graphics.wide, 'launch-party/banner-bg.png');
  assert.equal(party.graphics.wideMark, 'launch-party/banner-mark.json');
  assert.equal(party.graphics.og, 'launch-party/header-green.png');
  const hero = readFileSync(join(root, 'src/components/events/EventHero.astro'), 'utf8');
  assert.ok(!hero.includes('scale: 1.6129'), 'no CSS scale');
  for (const t of ['event-banner__mark', 'preserveAspectRatio="none"', 'aria-hidden="true"', 'fill: var(--accent)', 'fill: var(--text-on-dark)']) assert.ok(hero.includes(t), t);
  assert.match(hero, /\.event-banner__mark\s*\{[^}]*display:\s*none/);
  assert.match(hero, /@media \(min-width: 48rem\)[\s\S]*\.event-banner__mark\s*\{[^}]*display:\s*block/);
});

test('11d. built page: banner', { skip: skipBuilt }, () => {
  const html = page();
  assert.equal([...html.matchAll(/<svg\b[^>]*class="[^"]*event-banner__mark/g)].length, 1);
  const svg = html.match(/<svg\b[^>]*event-banner__mark[\s\S]*?<\/svg>/)![0];
  assert.equal([...svg.matchAll(/<path\b[^>]*fill-rule="evenodd"/g)].length, 2);
  const wide = [...html.matchAll(/<source\b[^>]*media="\(min-width: 48rem\)"[^>]*>/g)].map((m) => m[0]);
  assert.equal(wide.length, 2);
  for (const s of wide) assert.equal([...attr(s, 'srcset')!.matchAll(/banner-bg[^ ]* \d+w/g)].length, 2, 'two banner-bg widths');
  assert.equal(meta(html, 'og:image:width'), '857');
  assert.equal(meta(html, 'og:image:height'), '450');
});
