// Analytics helpers (A1). Pure, no DOM at import time. Events carry a name and the page path, nothing else:
// never an href, a query string or a form field.

export type EventName = 'book' | 'contact' | 'email' | 'call' | 'text' | 'policies' | 'rsvp';

/** Built by Base from src/data/site.ts and sent to the browser as page data, so no link is typed here. */
export interface Rules {
  book: string[]; // PocketSuite booking URLs
  contact: string[]; // PocketSuite lead and chat URLs
  policies: string; // path of the policies PDF, base included
}

/** True when `pathname` is one of `excluded` or below it. `base` is site.deploy.base; '.html' and a trailing slash are ignored. */
export function isExcluded(pathname: string, excluded: readonly string[], base = '/'): boolean {
  const b = base.replace(/\/+$/, '');
  let p = pathname.replace(/(?:index)?\.html$/, '').replace(/\/+$/, '');
  if (b && p.startsWith(b)) p = p.slice(b.length);
  p = p || '/';
  return excluded.some((e) => p === e || p.startsWith(`${e}/`));
}

const bare = (u: URL) => `${u.origin}${u.pathname}${u.search}`;

/** The event a link click should send, or null. */
export function classifyHref(href: string, rules: Rules, origin: string): EventName | null {
  let u: URL;
  try {
    u = new URL(href, origin);
  } catch {
    return null;
  }
  if (u.protocol === 'mailto:') return 'email';
  if (u.protocol === 'tel:') return 'call';
  if (u.protocol === 'sms:') return 'text';
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (rules.book.some((b) => bare(new URL(b)) === bare(u))) return 'book';
  if (rules.contact.some((c) => new URL(c).origin + new URL(c).pathname === u.origin + u.pathname)) return 'contact';
  if (u.origin === origin && u.pathname === rules.policies) return 'policies';
  return null;
}

interface Umami {
  track(name: string, data?: Record<string, string>): void;
}

/** Sends one event. Does nothing when the tracker is absent (blocked, not loaded, not production). */
export function trackEvent(name: EventName, win: { umami?: Umami; location: { pathname: string } } = window): void {
  try {
    win.umami?.track(name, { page: win.location.pathname });
  } catch {
    // Analytics must never break the page.
  }
}
