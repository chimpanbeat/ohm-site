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

export const SCENARIOS = {
  '/events/launch-party': rsvp,
};
