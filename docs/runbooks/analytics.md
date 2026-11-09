# Analytics (Umami Cloud)

Cookieless, no banner. The script counts only on `ohmprecisionbodywork.com` (`data-domains`), so localhost and previews send nothing. Config: `src/data/analytics.ts`. Never on `/body-map` (I-115).

## Events
`book` (PocketSuite booking links), `contact` (Send a request, Chat with me), `email`, `call`, `text`, `policies` (policies PDF), `rsvp`. Each carries the event name and the page path, nothing else.

## UTM links
### Standing rule (I-116)
Whenever a step builds or changes something that gets shared off-site (event pages, QR codes, printed-piece URLs, links for texts, emails, social posts, partner referrals, the Google Business Profile website link), Code proposes the tagged link(s) in its report to Brian.

### Conventions
- Lowercase, hyphens between words.
- `utm_source` = where: `sms`, `email`, `instagram`, `facebook`, `google-gbp`, `flyer`, `card`, `partner`.
- `utm_medium` = `sms`, `email`, `social`, `print`, `referral`, `organic`.
- `utm_campaign` = the effort: `launch`, `launch-party`, `<season>-<year>`. One per push.
- Never on internal links (the site's own links add no query strings).
- Never personal data in a tag: no names, emails, phone numbers or addresses.

Add the tags to every link you share, so the dashboard shows where visits came from:

| Where you post it | Tag |
|---|---|
| Text message | `?utm_source=sms&utm_medium=sms&utm_campaign=launch` |
| Email | `?utm_source=email&utm_medium=email&utm_campaign=launch` |
| Instagram | `?utm_source=instagram&utm_medium=social&utm_campaign=launch` |
| Facebook | `?utm_source=facebook&utm_medium=social&utm_campaign=launch` |
| Google Business Profile | `?utm_source=google-gbp&utm_medium=organic&utm_campaign=launch` |
| Flyer or QR code | `?utm_source=flyer&utm_medium=print&utm_campaign=launch` |
| Business card | `?utm_source=card&utm_medium=print&utm_campaign=launch` |
| Partner referral | `?utm_source=partner&utm_medium=referral&utm_campaign=launch` |

Example: `https://ohmprecisionbodywork.com/events/launch-party?utm_source=sms&utm_medium=sms&utm_campaign=launch-party`. Umami reads the tags from the first pageview; they appear under Sources and UTM in the dashboard. The site's own links add no query strings.

## Exclude your own devices
On each phone and laptop you use, open the live site once and run this in the browser console:

`localStorage.setItem('umami.disabled', 1)`

On a phone, add a bookmark whose address is `javascript:localStorage.setItem('umami.disabled',1);alert('Umami off')`, then open the live site and tap that bookmark. It is per browser: repeat it in each browser, and again after clearing site data. To turn counting back on: `localStorage.removeItem('umami.disabled')`.

## Check it works
1. Open the live site, click a "Book" button, then watch Umami → Realtime: one pageview and one `book` event.
2. On `http://localhost:4321/` the browser's Network tab shows no request to `cloud.umami.is/api/send`.
3. `npm run check` fails if `dist/body-map.html` ever loads `cloud.umami.is`, or if any other page lacks the tag.
