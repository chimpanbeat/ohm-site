// Client script 6 (E10, I-100, I-101). Imported only by events/[event].astro (ARCHITECTURE §B10 E8–E11).
// Fills the hero countdown and marks the timeline's current item, both computed in the browser so the static build never
// shows a stale number. No request, no storage; the only import is the pure time helper.
import { countdown, currentItem } from '../lib/event-time.ts';

const line = document.querySelector<HTMLElement>('.event-countdown');
const items = Array.from(document.querySelectorAll<HTMLElement>('.timeline__item[data-start][data-end]'));
const spans = items.map((li) => ({ start: li.dataset.start ?? '', end: li.dataset.end ?? '' }));

type Strings = { days: string; tomorrow: string; today: string };

function paintCountdown(nowMs: number): void {
  if (!line) return;
  const d = line.dataset;
  const strings = JSON.parse(d.text ?? '{}') as Strings;
  const c = countdown(nowMs, d.start ?? '', d.end ?? '', d.tz ?? 'UTC');
  line.textContent = !c ? '' : c.kind === 'days' ? strings.days.replace('{n}', String(c.n)) : c.kind === 'tomorrow' ? strings.tomorrow : strings.today;
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
