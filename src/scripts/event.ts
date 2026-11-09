// Client script 6 (E10, I-100, I-101). Imported only by events/[event].astro (ARCHITECTURE §B10 E8–E11).
// Fills the hero countdown and marks the timeline's current item, both computed in the browser so the static build never
// shows a stale number. No request, no storage; the only import is the pure time helper.
// Brian, Nov 9: the countdown is a split-flap board. The digits (or the word, for Tomorrow and Today) roll through the
// pool like a departure board when the page loads and flip when the day changes; reduced motion just shows the result.
import { countdown, currentItem } from '../lib/event-time.ts';

const line = document.querySelector<HTMLElement>('.event-countdown');
const items = Array.from(document.querySelectorAll<HTMLElement>('.timeline__item[data-start][data-end]'));
const spans = items.map((li) => ({ start: li.dataset.start ?? '', end: li.dataset.end ?? '' }));

type Strings = { days: string; tomorrow: string; today: string };

const FLIP_MS = 160; // one flip: the top flap falls, then the bottom flap lands
const STEP_MS = 70; // pause between flips of a rolling tile
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function setChar(tile: HTMLElement, ch: string): void {
  for (const b of tile.querySelectorAll('b')) b.textContent = ch;
  tile.dataset.ch = ch;
}

function makeTile(ch: string): HTMLElement {
  const tile = document.createElement('span');
  tile.className = 'flip';
  // static top (the new character), static bottom (the old one), then the two flaps that carry the change
  tile.innerHTML =
    '<span class="flip__h flip__top"><b></b></span><span class="flip__h flip__bottom"><b></b></span>' +
    '<span class="flip__h flip__top flip__flap-top"><b></b></span><span class="flip__h flip__bottom flip__flap-bottom"><b></b></span>';
  setChar(tile, ch);
  return tile;
}

async function flipOnce(tile: HTMLElement, next: string): Promise<void> {
  const old = tile.dataset.ch ?? ' ';
  const [top, bottom, flapTop, flapBottom] = Array.from(tile.children) as HTMLElement[];
  const put = (el: HTMLElement, ch: string) => (el.querySelector('b')!.textContent = ch);
  put(top, next);
  put(bottom, old);
  put(flapTop, old);
  put(flapBottom, next);
  tile.classList.remove('is-flipping');
  void tile.offsetWidth; // restart the animation
  tile.classList.add('is-flipping');
  await sleep(FLIP_MS);
  setChar(tile, next);
  tile.classList.remove('is-flipping');
}

// Roll a tile through its pool (digits, or letters) from a random start until it lands on `target` after at least `min` flips.
async function roll(tile: HTMLElement, target: string, min: number, delay: number): Promise<void> {
  const pool = /\d/.test(target) ? '0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!';
  if (reduced || !pool.includes(target)) return setChar(tile, target);
  await sleep(delay);
  let i = Math.floor(Math.random() * pool.length);
  for (let n = 0; n < min || pool[i % pool.length] !== target; n++) {
    i++;
    await flipOnce(tile, pool[i % pool.length]);
    await sleep(STEP_MS);
  }
}

function word(text: string): HTMLElement {
  const s = document.createElement('span');
  s.className = 'event-countdown__word';
  s.textContent = text.trim();
  return s;
}

function paintCountdown(nowMs: number): void {
  if (!line) return;
  const d = line.dataset;
  const strings = JSON.parse(d.text ?? '{}') as Strings;
  const c = countdown(nowMs, d.start ?? '', d.end ?? '', d.tz ?? 'UTC');
  const plain = !c ? '' : c.kind === 'days' ? strings.days.replace('{n}', String(c.n)) : c.kind === 'tomorrow' ? strings.tomorrow : strings.today;
  if (d.shown === plain) return;
  d.shown = plain;
  if (!c) {
    line.replaceChildren();
    return;
  }
  // "In {n} days": the words around the number stay plain, only the number is on the board
  const [before, after] = c.kind === 'days' ? strings.days.split('{n}') : ['', ''];
  const target = (c.kind === 'days' ? String(c.n) : plain.replace(/\s+/g, '').toUpperCase()).split('');
  const sr = document.createElement('span');
  sr.className = 'event-countdown__sr';
  sr.textContent = plain;
  const board = document.createElement('span');
  board.className = 'event-countdown__board';
  board.setAttribute('aria-hidden', 'true');
  board.dataset.long = String(target.length > 4);
  const tiles = target.map(() => makeTile(reduced ? '' : '0'));
  const parts: HTMLElement[] = [];
  if (before?.trim()) parts.push(word(before));
  parts.push(...tiles);
  if (after?.trim()) parts.push(word(after));
  board.replaceChildren(...parts);
  line.replaceChildren(sr, board);
  tiles.forEach((tile, i) => void roll(tile, target[i], 6 + i * 3, i * 120));
}

function paintTimeline(nowMs: number): void {
  const now = currentItem(spans, nowMs);
  items.forEach((li, i) => {
    li.classList.toggle('timeline__item--now', i === now);
    if (i === now) li.setAttribute('aria-current', 'time');
    else li.removeAttribute('aria-current');
  });
}

function paint(): void {
  const nowMs = Date.now();
  paintCountdown(nowMs);
  paintTimeline(nowMs);
}

paint();
setInterval(() => {
  if (document.visibilityState === 'visible') paint();
}, 60_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') paint();
});
