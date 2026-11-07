// Client script 5 (E2). Imported only by RsvpForm, so it is on event pages that have an RSVP form (ARCHITECTURE §B10).
// A thin DOM layer: the logic is createRsvp() in src/lib/rsvp.ts. The form works without it (a plain post to the
// Apps Script with mode=html); this adds spots left, the guest rows, validation and the in-page result.
// The only request is to the form's own action. Nothing is stored, logged or put in the URL.
import { createRsvp, type RawFields, type RsvpConfig, type RsvpState, type RsvpText } from '../lib/rsvp.ts';

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
  const result = q<HTMLElement>('.rsvp-result')!;
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
  const attending = Array.from(form.querySelectorAll<HTMLElement>('[data-attending]'));
  const syncStatus = () => {
    const cant = form.querySelector<HTMLInputElement>('input[name="status"]:checked')?.value === 'cant';
    for (const el of attending) el.hidden = cant;
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

  // ---- Show the state.
  let resultShown = false;
  const render = (s: RsvpState) => {
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
    if (s.result) {
      result.querySelector('.rsvp-result__title')!.textContent = s.result.title;
      result.querySelector('.rsvp-result__text')!.textContent = s.result.text;
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
      result.querySelector<HTMLElement>('.rsvp-result__calendar')!.hidden = !s.result.calendar;
      result.hidden = false;
      if (!resultShown) result.focus();
    }
    resultShown = s.result !== null;
  };
  rsvp.subscribe(render);

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
