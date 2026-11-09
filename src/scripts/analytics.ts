// Client script 7 (A1). Loaded by Base on every page except the bare /hello and the excluded ones. One delegated click listener:
// a tap on a booking, contact, email, phone, text or policies link sends an event name and the page path.
// The rules come from the page (meta name="analytics-rules"), built from src/data/site.ts. Nothing is stored.
import { classifyHref, trackEvent, type Rules } from '../lib/analytics.ts';

const meta = document.querySelector<HTMLMetaElement>('meta[name="analytics-rules"]');
if (meta) {
  let rules: Rules | null = null;
  try {
    rules = JSON.parse(meta.content) as Rules;
  } catch {
    rules = null;
  }
  if (rules) {
    document.addEventListener('click', (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!a) return;
      const name = classifyHref(a.getAttribute('href') ?? '', rules, location.origin);
      if (name) trackEvent(name);
    });
  }
}
