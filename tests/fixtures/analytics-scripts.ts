// The two scripts Base adds to every tracked page (A1): the Umami tag and the bundled click script.
// Tests that count a page's own scripts ignore these.
import { analytics } from '../../src/data/analytics.ts';

export const isAnalyticsScript = (attrs: string): boolean =>
  attrs.includes(analytics.scriptSrc) || /\bsrc="[^"]*\/Base\.astro_astro_type_script[^"]*\.js"/i.test(attrs);
