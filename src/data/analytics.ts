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
