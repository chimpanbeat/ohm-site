// Umami Cloud analytics (A1, I-113, I-114, I-115). The Website ID is public: it ships in the script tag.
// Counting happens only on the production hostname (data-domains), so localhost and previews send nothing.
import { site } from './site.ts';

export const analytics = {
  scriptSrc: 'https://cloud.umami.is/script.js',
  websiteId: '1e2065b0-02e0-409c-86a1-59780d47aec5',
  /** data-domains: the production hostname only. */
  domain: new URL(site.deploy.customDomain).hostname,
  /**
   * Pages that never load analytics, in production or preview (I-115: the body map carries health information).
   * Base enforces this whatever a page passes; scripts/check-dist.mjs checks the built files.
   */
  excludedPaths: ['/body-map'],
} as const;

/**
 * Printed short links (I-147): path → target with its UTM tags, merged into `redirects` in astro.config.mjs (which adds
 * site.deploy.base). Paths are one lowercase segment; tags follow docs/runbooks/analytics.md (utm_content: one value per
 * printed design). A redirect page has no Umami tag; the visit and its tags are counted on the target page.
 * A target can change at any time: a static build serves a meta refresh page, never an HTTP 301 a browser could cache.
 */
export const shortLinks: Record<string, string> = {
  // the launch party fridge magnet's QR code encodes https://ohmprecisionbodywork.com/shrug
  '/shrug': '/book?utm_source=magnet&utm_medium=print&utm_campaign=launch-party&utm_content=shrug',
};
