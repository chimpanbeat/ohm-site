// Steps that drive a route into a form state before `npm run shots --stub` captures it (I-122).
// Keyed by route. A scenario gets the Playwright page and returns when the state is on screen.
// B4 adds the body map scenario here. Test values only: never real names, emails or addresses.

async function rsvp(page) {
  await page.fill('#rsvp-name', 'Test Guest');
  await page.fill('#rsvp-email', 'test@example.com');
  await page.check('input[name="status"][value="going"]');
  await page.check('input[name="session"] >> nth=0'); // Going asks which yoga session
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(400);
}

// B4: the body map (a preview build: OHM_BODYMAP_PREVIEW=1). Test name, a date three days out, one mark on the figure, send.
async function bodymap(page) {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const p = (n) => String(n).padStart(2, '0');
  // start clean: a route visited earlier in the same browser context left its autosaved mark behind
  await page.evaluate(() => localStorage.removeItem('ohm-bodymap-v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('#bm-name', 'Test Client');
  await page.fill('#bm-date', `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  const box = await page.locator('#bm-figure').boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.3);
  await page.click('#bm-send');
  await page.waitForTimeout(600);
}

export const SCENARIOS = {
  '/events/launch-party': rsvp,
  '/body-map': bodymap,
  '/body-map/': bodymap, // public/body-map/index.html, a refresh stub: `--route /body-map` matches it too, and it lands on the page
};
