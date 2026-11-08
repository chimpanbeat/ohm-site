// Client script 5 (E2). Imported only by RsvpForm, so it is on event pages that have an RSVP form (ARCHITECTURE §B10).
// A thin DOM layer: the logic is createRsvp() in src/lib/rsvp.ts. The form works without it (a plain post to the
// Apps Script with mode=html); this adds spots left, the guest rows, validation and the in-page result.
// The only request is to the form's own action. Nothing is stored, logged or put in the URL.
import { confettiPieces, createRsvp, reelFor, type RawFields, type ResultView, type RsvpConfig, type RsvpState, type RsvpText } from '../lib/rsvp.ts';

// E9 (§A3, the eleventh to thirteenth exceptions): the script only adds a node or a class; CSS moves it. One check.
const CONFETTI = 24;
const REEL_ITEMS = 6;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Removes a decoration when its last animation ends, or after `ms` if no animation runs (so nothing is left behind).
function removeAfter(node: HTMLElement, pending: number, ms: number): void {
  let left = pending;
  const done = () => node.remove();
  const timer = setTimeout(done, ms);
  node.addEventListener('animationend', () => {
    if (--left <= 0) {
      clearTimeout(timer);
      done();
    }
  });
}

function start(form: HTMLFormElement): void {
  const root = form.closest<HTMLElement>('.rsvp');
  if (!root) return;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const d = form.dataset;

  const text = JSON.parse(d.text ?? '{}') as RsvpText;
  const config: RsvpConfig = {
    slug: d.slug ?? '',
    closesAt: d.closesAt ?? '',
    maxGuests: Number(d.maxGuests ?? 0),
    session: d.sessionLabel ? { label: d.sessionLabel, waitlist: d.waitlist === 'true' } : null,
  };
  const rsvp = createRsvp({
    fetch: (url, init) => fetch(url, init),
    event: config,
    text,
    url: form.getAttribute('action') ?? '',
    email: d.email ?? '',
  });

  // JS mode: the page validates itself and asks for JSON.
  form.noValidate = true;
  const mode = form.elements.namedItem('mode');
  if (mode instanceof HTMLInputElement) mode.value = 'json';

  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const banner = q<HTMLElement>('.rsvp-banner')!;
  const spots = q<HTMLElement>('.rsvp-spots')!;
  const closed = q<HTMLElement>('.rsvp-closed')!;
  const heading = q<HTMLElement>('.rsvp-heading');
  const intro = q<HTMLElement>('.rsvp-intro');
  const result = q<HTMLElement>('.rsvp-result')!;
  const statusLine = result.querySelector<HTMLElement>('.rsvp-result__status')!;
  const cheer = result.querySelector<HTMLElement>('.rsvp-result__cheer')!;
  const cheerText = cheer.querySelector<HTMLElement>('.rsvp-result__cheer-text')!;
  const emoji = cheer.querySelector<HTMLElement>('.rsvp-result__emoji')!;
  const actions = result.querySelector<HTMLElement>('.rsvp-result__actions')!;
  const calendars = Array.from(actions.querySelectorAll<HTMLElement>('.rsvp-result__calendar')); // E14: Google, then the .ics
  const noticeLinks = Array.from(actions.querySelectorAll<HTMLElement>('.rsvp-result__notice'));
  const tipCard = q<HTMLElement>('.rsvp-tip')!;
  const tipWindow = tipCard.querySelector<HTMLElement>('.rsvp-tip__window')!;
  const tipText = tipCard.querySelector<HTMLElement>('.rsvp-tip__text')!;
  const tipNext = tipCard.querySelector<HTMLButtonElement>('.rsvp-tip__next')!;

  // ---- E9 decorations: confetti for Going (I-099), the emoji's one-shot class (I-105), the tip reel (I-095).
  function confetti(): void {
    const box = document.createElement('div');
    box.className = 'rsvp-confetti';
    box.setAttribute('aria-hidden', 'true');
    for (const p of confettiPieces(CONFETTI, Math.random)) {
      const i = document.createElement('i');
      i.className = `c${p.colour}`;
      i.style.setProperty('--x', String(p.x));
      i.style.setProperty('--y', String(p.y));
      i.style.setProperty('--r', `${p.r}deg`);
      i.style.setProperty('--d', `${p.delay}ms`);
      box.append(i);
    }
    result.append(box);
    removeAfter(box, CONFETTI, 2500);
  }
  function showEmoji(view: ResultView): void {
    emoji.textContent = view.cheerEmoji ?? '';
    emoji.classList.remove('rsvp-result__emoji--maybe', 'rsvp-result__emoji--cant');
    if (view.answer === 'maybe' || view.answer === 'cant') emoji.classList.add(`rsvp-result__emoji--${view.answer}`);
  }
  let reel: HTMLElement | null = null;
  function spin(landing: string): void {
    reel?.remove();
    reel = null;
    const tips = rsvp.allTips();
    if (reduceMotion() || tips.length < 2) return;
    const items = reelFor(tips, landing, Math.random, REEL_ITEMS);
    const h = tipWindow.getBoundingClientRect().height;
    if (!h) return;
    const box = document.createElement('div');
    box.className = 'rsvp-tip__reel';
    box.setAttribute('aria-hidden', 'true');
    box.style.setProperty('--h', `${h}px`);
    const strip = document.createElement('div');
    strip.className = 'rsvp-tip__strip';
    strip.style.setProperty('--steps', String(items.length - 1));
    for (const tip of items) {
      const item = document.createElement('div');
      item.className = 'rsvp-tip__reel-item';
      item.textContent = tip;
      strip.append(item);
    }
    box.append(strip);
    tipWindow.append(box);
    reel = box;
    removeAfter(box, 1, 1300);
  }
  const errorSpans = Array.from(form.querySelectorAll<HTMLElement>('[data-error-for]'));

  // ---- Guest rows: none until asked, one at a time, up to the rows the page rendered. The ceiling is never said.
  const rows = Array.from(form.querySelectorAll<HTMLElement>('.guest'));
  const addButton = form.querySelector<HTMLButtonElement>('.guest-add');
  const syncAdd = () => {
    if (addButton) addButton.hidden = rows.every((r) => !r.hidden);
  };
  for (const row of rows) {
    row.hidden = true;
    const remove = row.querySelector<HTMLButtonElement>('.guest-remove');
    if (remove) {
      remove.hidden = false;
      remove.addEventListener('click', () => {
        for (const el of row.querySelectorAll<HTMLInputElement>('input')) {
          if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
          else el.value = '';
        }
        row.hidden = true;
        syncAdd();
        addButton?.focus();
      });
    }
  }
  syncAdd();
  addButton?.addEventListener('click', () => {
    const next = rows.find((r) => r.hidden);
    if (!next) return;
    next.hidden = false;
    syncAdd();
    next.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
  });

  // ---- Can't go: no session question and no guests.
  // E14 (Brian, Nov 8): a Maybe holds no session spot, so the session question (yours and each guest's) goes too, and the
  // guests help line stops mentioning it. Answers already given are kept, not sent: validation ignores them unless Going.
  const attending = Array.from(form.querySelectorAll<HTMLElement>('[data-attending]'));
  const goingOnly = Array.from(form.querySelectorAll<HTMLElement>('[data-going-only]'));
  const guestsHelp = form.querySelector<HTMLElement>('.rsvp-guests > .help');
  const helpFull = guestsHelp?.textContent ?? '';
  const syncStatus = () => {
    const chosen = form.querySelector<HTMLInputElement>('input[name="status"]:checked')?.value;
    const cant = chosen === 'cant';
    const notGoing = chosen === 'maybe' || cant;
    for (const el of attending) el.hidden = cant;
    for (const el of goingOnly) el.hidden = notGoing;
    if (guestsHelp) guestsHelp.textContent = chosen === 'maybe' ? (guestsHelp.dataset.help ?? helpFull) : helpFull;
  };
  form.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).name === 'status') syncStatus();
  });
  syncStatus();

  // ---- Errors sit under their fields (aria-invalid, aria-describedby) and clear when the visitor edits the field.
  function showError(span: HTMLElement, message: string): void {
    span.hidden = !message;
    span.textContent = message;
    for (const input of form.querySelectorAll<HTMLInputElement>(`[name="${span.dataset.errorFor ?? ''}"]`)) {
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', span.id);
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    }
  }
  const clearOnEdit = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.getAttribute('aria-invalid') !== 'true') return;
    const span = errorSpans.find((s) => s.dataset.errorFor === el.name);
    if (span) showError(span, '');
  };
  form.addEventListener('input', clearOnEdit);
  form.addEventListener('change', clearOnEdit);

  // ---- The floating RSVP bar (E10, I-097): visible only while RSVPs are open, there is no result, and the #rsvp section
  // is entirely below the viewport. It hides while the section is on screen and after it, so it never covers the notice,
  // the credits or the footer. Without JS it stays `hidden`. Nothing is stored and the URL does not change.
  const bar = document.querySelector<HTMLElement>('.rsvp-bar');
  const section = document.getElementById('rsvp');
  let sectionBelow = false;
  let barOff = false; // closed, or a result is showing
  const syncBar = () => {
    const hide = barOff || !sectionBelow;
    if (bar && bar.hidden !== hide) bar.hidden = hide;
  };
  if (bar && section && 'IntersectionObserver' in window) {
    // The observer fires when the section enters or leaves the viewport; a jump from above to below it (an anchor, a
    // fast scroll, End) crosses nothing, so a passive scroll check measures it too (one rect read; `hidden` is only
    // written when it changes).
    const measure = () => {
      sectionBelow = section.getBoundingClientRect().top >= window.innerHeight;
      syncBar();
    };
    new IntersectionObserver(measure).observe(section);
    window.addEventListener('scroll', measure, { passive: true });
    measure();
    bar.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-status]');
      if (!button) return;
      const radio = form.querySelector<HTMLInputElement>(`input[name="status"][value="${button.dataset.status ?? ''}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true })); // so Can't go hides the session question and guests
      section.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
      form.querySelector<HTMLInputElement>('#rsvp-name')?.focus({ preventScroll: true });
    });
  }

  // ---- Show the state.
  let resultShown = false;
  const render = (s: RsvpState) => {
    barOff = s.closed || s.result !== null;
    syncBar();
    spots.hidden = !s.spots;
    spots.textContent = s.spots ?? '';
    closed.hidden = !s.closed;
    banner.hidden = !s.banner;
    banner.textContent = s.banner ?? '';
    submit.disabled = s.sending;
    submit.textContent = s.sending ? (text.sending ?? '') : (text.submit ?? '');
    form.setAttribute('aria-busy', String(s.sending));
    for (const span of errorSpans) showError(span, s.fieldErrors[span.dataset.errorFor ?? ''] ?? '');
    form.hidden = s.closed || s.result !== null;
    // E9 (I-094): after a result the heading stays for screen readers (the outline keeps H2 RSVP over the H3 result);
    // the intro and the spots line go.
    heading?.classList.toggle('visually-hidden', s.result !== null);
    if (intro) intro.hidden = s.result !== null;
    if (s.result) spots.hidden = true;
    if (s.result) {
      result.querySelector('.rsvp-result__title')!.textContent = s.result.title;
      result.querySelector('.rsvp-result__text')!.textContent = s.result.text;
      statusLine.textContent = s.result.statusLine ?? '';
      statusLine.hidden = !s.result.statusLine;
      cheerText.textContent = s.result.cheer ?? '';
      cheer.hidden = !s.result.cheer;
      if (!resultShown) showEmoji(s.result);
      const list = result.querySelector<HTMLElement>('.rsvp-lines')!;
      list.replaceChildren(
        ...s.result.lines.map((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          return li;
        }),
      );
      list.hidden = s.result.lines.length === 0;
      const note = result.querySelector<HTMLElement>('.rsvp-result__note')!;
      note.hidden = !s.result.note;
      note.textContent = s.result.note ?? '';
      actions.hidden = !s.result.calendar;
      for (const a of calendars) a.hidden = !s.result.calendar;
      for (const a of noticeLinks) a.hidden = !s.result.calendar;
      result.hidden = false;
      if (!resultShown) {
        result.focus();
        if (s.result.answer === 'going' && !reduceMotion()) confetti();
      }
    }
    resultShown = s.result !== null;
    // The self-care tip (E6): plain text only, shown under any successful reply. The live region speaks only when its
    // text changes, so the first tip is read by moving on to it and "Another tip" announces the new one. E9: the real
    // text is set first, then the reel (decoration) spins over it.
    const tip = s.result ? (s.tip ?? '') : '';
    tipCard.hidden = !tip;
    tipNext.hidden = !tip || !s.moreTips;
    if (tipText.textContent !== tip) {
      tipText.textContent = tip;
      if (tip) spin(tip);
    }
  };
  rsvp.subscribe(render);
  tipNext.addEventListener('click', () => rsvp.nextTip());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields: RawFields = {};
    for (const [key, value] of new FormData(form)) if (typeof value === 'string') fields[key] = value;
    await rsvp.submit(fields);
    const s = rsvp.state;
    if (s.focus) form.querySelector<HTMLElement>(`[name="${s.focus}"]`)?.focus();
    else if (s.banner) submit.focus();
  });

  void rsvp.load();
}

const form = document.querySelector<HTMLFormElement>('form.rsvp-form');
if (form) start(form);
