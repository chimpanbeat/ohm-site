# Analytics (Umami Cloud)

Cookieless, no banner. The script counts only on `ohmprecisionbodywork.com` (`data-domains`), so localhost and previews send nothing. Config: `src/data/analytics.ts`. Never on `/body-map` (I-115).

## Events
`book` (PocketSuite booking links), `contact` (Send a request, Chat with me), `email`, `call`, `text`, `policies` (policies PDF), `rsvp`. Each carries the event name and the page path, nothing else.

## UTM links
Add these to every link you share, so the dashboard shows where visits came from:

| Where you post it | Tag |
|---|---|
| Text message | `?utm_source=sms&utm_campaign=launch` |
| Email | `?utm_source=email&utm_campaign=launch` |
| Instagram | `?utm_source=instagram&utm_campaign=launch` |
| Flyer or QR code | `?utm_source=flyer&utm_campaign=launch` |

Example: `https://ohmprecisionbodywork.com/events/launch-party?utm_source=sms&utm_campaign=launch`. Use lowercase, one `utm_campaign` per push. Umami reads the tags from the first pageview; they appear under Sources and UTM in the dashboard. The site's own links add no query strings.

## Exclude your own devices
On each phone and laptop you use, open the live site once and run this in the browser console:

`localStorage.setItem('umami.disabled', 1)`

On a phone, add a bookmark whose address is `javascript:localStorage.setItem('umami.disabled',1);alert('Umami off')`, then open the live site and tap that bookmark. It is per browser: repeat it in each browser, and again after clearing site data. To turn counting back on: `localStorage.removeItem('umami.disabled')`.

## Check it works
1. Open the live site, click a "Book" button, then watch Umami → Realtime: one pageview and one `book` event.
2. On `http://localhost:4321/` the browser's Network tab shows no request to `cloud.umami.is/api/send`.
3. `npm run check` fails if `dist/body-map.html` ever loads `cloud.umami.is`, or if any other page lacks the tag.
