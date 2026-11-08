// Ohm event RSVPs: the whole Apps Script web app (E3, I-049 and I-050; ARCHITECTURE section B10).
// CONTRACT FILE. Plain V8 script: no export, no import. Helpers end in "_" so Apps Script hides them from the Run menu.
//
// How it fits: the site publishes each event's public facts and every string of copy as /events/<slug>.json (the
// feed). This script reads the feed, so a new event or a copy change needs no change here. The settings are the
// Script Properties SHEET_ID (the private sheet that holds the RSVPs) and, from E6, TIPS_SHEET_ID (Brian's self-care
// tips sheet). Nothing else is configured and no guest data, sheet ID, script ID or email address lives in the repository.
//
// Entry points: doGet (spots left, or the change-confirm page), doPost (an RSVP, a change request, or a confirmed
// change), sendDueReminders (a 15-minute trigger), setup (run once by hand).

var SITE_ORIGIN = 'https://ohmprecisionbodywork.com';
var SLUG_RE = /^[a-z0-9-]{1,40}$/;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var NAME_MAX = 80;
var EMAIL_MAX = 254;
var FEED_TTL = 600; // seconds the feed is cached
var CHANGE_TTL = 21600; // seconds a change link lives (6 hours)
var CHANGE_MAX = 3; // change mails per RSVP per CHANGE_TTL
var LOCK_MS = 20000;
var TIPS_TAB = 'Sheet1'; // the tab of Brian's "Self Care tip of the day" sheet (column A, header "Tip"); a renamed tab falls back to the first
var TIPS_TTL = 300; // seconds the tips are cached
var TIP_MAX = 280; // longer tips are skipped
var TIPS_MAX = 100; // at most this many tips are used
var COLS = 11; // Submitted, Changed, RSVP, Who, Name, Email, Opt-in, Status, <session>, Waitlist #, Reminder sent
var C = { submitted: 0, changed: 1, id: 2, who: 3, name: 4, email: 5, optin: 6, status: 7, cell: 8, wait: 9, reminder: 10 };
var CELL_KEY = { confirmed: 'outcomeConfirmed', waitlist: 'outcomeWaitlist', full: 'outcomeFull', no: 'outcomeNo', maybe: 'outcomeMaybe' };

// ---- Small helpers -----------------------------------------------------------------------------------------------

function now_() {
  return new Date().getTime();
}

function iso_(ms) {
  return new Date(ms).toISOString();
}

function str_(v) {
  return v === undefined || v === null ? '' : String(v);
}

function fill_(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
  });
}

function words_(label) {
  var l = str_(label);
  return { session: l.toLowerCase(), Session: l.charAt(0).toUpperCase() + l.slice(1) };
}

function esc_(v) {
  return str_(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// A text cell: control characters stripped, and a leading = + - @ made harmless (no formula injection).
function cell_(v) {
  var s = str_(v).replace(/[\u0000-\u001f\u007f]/g, '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function uncell_(v) {
  var s = str_(v);
  return /^'[=+\-@]/.test(s) ? s.slice(1) : s;
}

// A timestamp cell, whether the sheet kept the text or turned it into a date.
function stamp_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString();
  return str_(v);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---- The event (the site's feed) ---------------------------------------------------------------------------------

function loadEvent_(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return null;
  var cache = CacheService.getScriptCache();
  var key = 'ev:' + slug;
  var body = cache.get(key);
  if (!body) {
    var res = UrlFetchApp.fetch(SITE_ORIGIN + '/events/' + slug + '.json', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return null;
    body = res.getContentText();
    cache.put(key, body, FEED_TTL);
  }
  var ev;
  try {
    ev = JSON.parse(body);
  } catch (err) {
    return null;
  }
  if (!ev || ev.v !== 1 || ev.slug !== slug || !ev.text || !ev.sender || typeof ev.closesAt !== 'string') return null;
  return ev;
}

function isClosed_(ev) {
  return now_() >= Date.parse(ev.closesAt);
}

// ---- Self-care tips (E6, I-082 and I-084; ARCHITECTURE section B10 Tips) -----------------------------------------
// The tips are Brian's rows in a private sheet, read through the Script Property TIPS_SHEET_ID. They are public the
// moment they are in the sheet (the status reply is open to anyone with the URL). Nothing here can throw.

// Column A of the sheet's values: control characters to a space, whitespace collapsed, trimmed; the header, empty rows,
// tips over TIP_MAX characters and case-insensitive duplicates are skipped; at most TIPS_MAX tips.
function cleanTips_(values) {
  var tips = [];
  var seen = Object.create(null);
  var rows = Array.isArray(values) ? values : [];
  for (var i = 0; i < rows.length && tips.length < TIPS_MAX; i++) {
    var cellValue = Array.isArray(rows[i]) ? rows[i][0] : rows[i];
    var tip = str_(cellValue).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    var key = tip.toLowerCase();
    if (!tip || key === 'tip' || tip.length > TIP_MAX || seen[key]) continue;
    seen[key] = true;
    tips.push(tip);
  }
  return tips;
}

// The cleaned tips: [] when TIPS_SHEET_ID is unset or the sheet can't be read. The result, even [], is cached for
// TIPS_TTL seconds, so Brian's edits arrive within about five minutes and a broken share costs one slow read per five.
function readTips_() {
  var cache = null;
  var id = null;
  try {
    id = PropertiesService.getScriptProperties().getProperty('TIPS_SHEET_ID');
    if (!id) return [];
    cache = CacheService.getScriptCache();
    var hit = cache.get('tips');
    if (hit) {
      var cached = JSON.parse(hit);
      if (Array.isArray(cached)) return cached;
    }
  } catch (err) {
    // a bad cache entry: read the sheet again
  }
  if (!id) return [];
  var tips = [];
  try {
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheetByName(TIPS_TAB) || ss.getSheets()[0];
    if (sheet) tips = cleanTips_(sheet.getDataRange().getValues());
  } catch (err) {
    tips = [];
  }
  try {
    if (cache) cache.put('tips', JSON.stringify(tips), TIPS_TTL);
  } catch (err) {
    // an uncached read is only slower
  }
  return tips;
}

// A shuffled walk through the tips: next() gives each once, reshuffles when they run out, and never gives the same tip
// twice in a row (the same rules as tipDeck in src/lib/rsvp.ts).
function tipDeck_(tips) {
  var order = [];
  var at = 0;
  var last = null;
  return {
    size: tips.length,
    next: function () {
      if (!tips.length) return '';
      if (at >= order.length) {
        order = tips.slice();
        for (var i = order.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var swap = order[i];
          order[i] = order[j];
          order[j] = swap;
        }
        if (order.length > 1 && order[0] === last) {
          var first = order[0];
          order[0] = order[order.length - 1];
          order[order.length - 1] = first;
        }
        at = 0;
      }
      last = order[at++];
      return last;
    },
  };
}

// ---- Validation (the same rules and cases as validateRsvp in src/lib/rsvp.ts) ------------------------------------

function answer_(v) {
  return v === 'yes' || v === 'no' ? v : undefined;
}

function validate_(input, ev) {
  var get = function (k) {
    return str_(input[k]);
  };
  if (get('website') !== '') return { ok: true, fields: [], bot: true };
  var maxGuests = ev.maxGuests || 0;
  var hasSession = !!ev.session;
  var fields = [];

  var name = get('name').trim();
  if (!name || name.length > NAME_MAX) fields.push('name');
  var email = get('email').trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) fields.push('email');
  var st = get('status');
  var status = st === 'going' || st === 'maybe' || st === 'cant' ? st : null;
  if (!status) fields.push('status');
  var cant = status === 'cant';

  var session;
  if (hasSession && !cant) {
    session = answer_(get('session'));
    if (!session) fields.push('session');
  }

  var guests = [];
  if (!cant) {
    for (var n = 1; n <= maxGuests; n++) {
      var gname = get('g' + n + 'name').trim();
      var raw = hasSession ? get('g' + n + 'session') : '';
      if (!gname && !raw) continue;
      var gsession = answer_(raw);
      var bad = false;
      if (!gname || gname.length > NAME_MAX) {
        fields.push('g' + n + 'name');
        bad = true;
      }
      if (hasSession && gname && !gsession) {
        fields.push('g' + n + 'session');
        bad = true;
      }
      if (!bad) guests.push(hasSession ? { name: gname, session: gsession } : { name: gname });
    }
  }

  if (fields.length || !status) return { ok: false, fields: fields };
  var normalized = { name: name, email: email, status: status, guests: guests, optin: get('optin') === 'yes' };
  if (session) normalized.session = session;
  return { ok: true, fields: fields, normalized: normalized };
}

// ---- The sheet ---------------------------------------------------------------------------------------------------

function openSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('The Script Property SHEET_ID is not set.');
  return SpreadsheetApp.openById(id);
}

function tab_(ss, ev, create) {
  var sheet = ss.getSheetByName(ev.slug);
  if (sheet || !create) return sheet;
  sheet = ss.insertSheet(ev.slug);
  // Plain text everywhere, so the sheet never turns a name or a time into a date or a formula.
  sheet.getRange(1, 1, sheet.getMaxRows(), COLS).setNumberFormat('@');
  var label = ev.session ? ev.session.label : 'Session';
  sheet
    .getRange(1, 1, 1, COLS)
    .setValues([['Submitted', 'Changed', 'RSVP', 'Who', 'Name', 'Email', 'Opt-in', 'Status', label, 'Waitlist #', 'Reminder sent']]);
  return sheet;
}

// The tab's people, one object per data row. `n` is the 1-based sheet row.
function readRows_(sheet) {
  if (!sheet) return [];
  var vals = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    if (!str_(r[C.id]) && !str_(r[C.who])) continue;
    rows.push({
      n: i + 1,
      submitted: stamp_(r[C.submitted]),
      changed: stamp_(r[C.changed]),
      id: str_(r[C.id]),
      who: str_(r[C.who]).trim().toLowerCase(),
      name: uncell_(r[C.name]),
      email: uncell_(r[C.email]).toLowerCase(),
      status: str_(r[C.status]).trim().toLowerCase(),
      cell: str_(r[C.cell]).trim().toLowerCase(),
      wait: Number(r[C.wait]) || 0,
      reminder: stamp_(r[C.reminder]),
    });
  }
  return rows;
}

function sheetRow_(p) {
  return [
    p.submitted,
    p.changed || '',
    p.id,
    p.who,
    cell_(p.name),
    p.who === 'you' ? cell_(p.email) : '',
    p.who === 'you' && p.optin ? 'yes' : '',
    p.status,
    p.cell || '',
    p.wait || '',
    p.reminder || '',
  ];
}

function appendRows_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, COLS).setValues(rows);
}

function findYou_(rows, email) {
  for (var i = 0; i < rows.length; i++) if (rows[i].who === 'you' && rows[i].email === email) return rows[i];
  return null;
}

function counts_(rows) {
  var c = { confirmed: 0, waitlisted: 0, maxWait: 0 };
  rows.forEach(function (r) {
    if (r.cell === 'confirmed') c.confirmed++;
    if (r.cell === 'waitlist') c.waitlisted++;
    if (r.wait > c.maxWait) c.maxWait = r.wait;
  });
  return c;
}

// ---- Assigning spots ---------------------------------------------------------------------------------------------

// people: [{ name, answer, keep? }] in order (you, then each guest). `c` counts every other row in the tab (and the
// kept cells). Returns [{ cell, wait }]. A yes under Maybe holds no spot; a new yes queues while anyone waits.
function assign_(ev, people, status, c) {
  var s = ev.session;
  var result = [];
  people.forEach(function (p) {
    if (!s || status === 'cant') {
      result.push({ cell: '', wait: 0 });
    } else if (p.keep) {
      result.push(p.keep);
    } else if (p.answer !== 'yes') {
      result.push({ cell: 'no', wait: 0 });
    } else if (status === 'maybe') {
      result.push({ cell: 'maybe', wait: 0 });
    } else if (c.confirmed < s.limit && c.waitlisted === 0) {
      c.confirmed++;
      result.push({ cell: 'confirmed', wait: 0 });
    } else if (s.waitlist) {
      c.waitlisted++;
      c.maxWait++;
      result.push({ cell: 'waitlist', wait: c.maxWait });
    } else {
      result.push({ cell: 'full', wait: 0 });
    }
  });
  return result;
}

function peopleOf_(n) {
  var people = [{ name: n.name, answer: n.session }];
  n.guests.forEach(function (g) {
    people.push({ name: g.name, answer: g.session });
  });
  return people;
}

function rowsFor_(id, submitted, changed, reminder, n, people, assigned) {
  return people.map(function (p, i) {
    return sheetRow_({
      submitted: submitted,
      changed: changed,
      id: id,
      who: i === 0 ? 'you' : 'guest',
      name: p.name,
      email: n.email,
      optin: n.optin,
      status: n.status,
      cell: assigned[i].cell,
      wait: assigned[i].wait,
      reminder: reminder,
    });
  });
}

function outcomesOf_(ev, status, assigned) {
  if (!ev.session || status === 'cant') return [];
  return assigned.map(function (a) {
    return a.cell;
  });
}

// ---- Mail --------------------------------------------------------------------------------------------------------

function vars_(ev) {
  return {
    title: ev.title,
    dateLabel: ev.dateLabel,
    timeLabel: ev.timeLabel,
    venue: ev.venue.name,
    address: ev.venue.address,
    icsUrl: ev.icsUrl,
    pageUrl: ev.pageUrl,
    siteName: ev.sender.name,
  };
}

function outcomeText_(ev, name, cell) {
  var t = ev.text;
  var w = words_(ev.session ? ev.session.label : '');
  return fill_(t.outcomeLine, { name: name, outcome: fill_(t[CELL_KEY[cell]], w) });
}

function noticeBlocks_(ev) {
  return (ev.notices || []).map(function (n) {
    return [n.title, n.text, n.url].filter(Boolean).join('\n');
  });
}

function send_(ev, to, subject, blocks) {
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: blocks.filter(Boolean).join('\n\n'),
      name: ev.sender.name,
      replyTo: ev.sender.replyTo,
    });
    return true;
  } catch (err) {
    return false; // a mail failure never undoes an RSVP
  }
}

// people: [{ name, cell }] for session events (cell '' = no line).
function sessionLines_(ev, people) {
  var t = ev.text;
  var lines = [];
  var maybe = false;
  people.forEach(function (p) {
    if (!CELL_KEY[p.cell]) return; // blank, or a note Brian typed: no line
    lines.push('- ' + outcomeText_(ev, p.name, p.cell));
    if (p.cell === 'maybe') maybe = true;
  });
  return { lines: lines, maybe: maybe, maybeNote: fill_(t.maybeNote, words_(ev.session ? ev.session.label : '')) };
}

function mailConfirmation_(ev, to, name, status, people, assigned) {
  var t = ev.text;
  var v = vars_(ev);
  var lines = [];
  if (ev.session) {
    var s = sessionLines_(
      ev,
      people.map(function (p, i) {
        return { name: p.name, cell: assigned[i].cell };
      }),
    );
    lines = s.lines.slice();
    if (assigned.some(function (a) { return a.cell === 'waitlist'; })) lines.push(t.waitlistNote);
    if (s.maybe) lines.push(s.maybeNote);
  }
  var blocks = [
    fill_(t.hi, { name: name }),
    fill_(t.confirmLead, merge_(v, { status: t[status] })),
    [fill_(t.when, v), fill_(t.where, v)].join('\n'),
    lines.join('\n'),
  ];
  noticeBlocks_(ev).forEach(function (b) {
    blocks.push(b);
  });
  blocks.push([fill_(t.calendarLine, v), fill_(t.detailsLine, v)].join('\n'));
  blocks.push(t.changeLine);
  blocks.push(fill_(t.signoff, v));
  send_(ev, to, fill_(t.confirmSubject, v), blocks);
}

function mailCant_(ev, to, name) {
  var t = ev.text;
  var v = vars_(ev);
  send_(ev, to, fill_(t.cantSubject, v), [fill_(t.hi, { name: name }), fill_(t.cantLead, v), fill_(t.signoff, v)]);
}

// After a new RSVP or a confirmed change: the confirmation, or the short note for can't go.
function mailOutcome_(ev, to, n, people, assigned) {
  if (n.status === 'cant') mailCant_(ev, to, n.name);
  else mailConfirmation_(ev, to, n.name, n.status, people, assigned);
}

function merge_(a, b) {
  var o = {};
  Object.keys(a).forEach(function (k) {
    o[k] = a[k];
  });
  Object.keys(b).forEach(function (k) {
    o[k] = b[k];
  });
  return o;
}

function answerLines_(ev, n) {
  var t = ev.text;
  if (!ev.session || n.status === 'cant') return [];
  var w = words_(ev.session.label);
  return peopleOf_(n).map(function (p) {
    return fill_(t.answerLine, { name: p.name, Session: w.Session, answer: p.answer === 'yes' ? t.yes : t.no });
  });
}

function mailChange_(ev, to, storedName, n, changeUrl) {
  var t = ev.text;
  var v = vars_(ev);
  var answer = [fill_(t.newAnswer, { status: t[n.status] })].concat(
    answerLines_(ev, n).map(function (l) {
      return '- ' + l;
    }),
  );
  send_(ev, to, fill_(t.changeSubject, v), [
    fill_(t.hi, { name: storedName }),
    fill_(t.changeLead, v),
    answer.join('\n'),
    [fill_(t.changeLinkLine, { changeUrl: changeUrl }), t.changeIgnore].join('\n'),
    fill_(t.signoff, v),
  ]);
}

function mailSpotFreed_(ev, freed) {
  var t = ev.text;
  var v = vars_(ev);
  var w = words_(ev.session.label);
  send_(ev, ev.sender.replyTo, fill_(t.spotFreedSubject, merge_(v, { session: w.session })), [
    fill_(t.spotFreedText, { session: w.session, n: freed }),
    fill_(t.detailsLine, v),
  ]);
}

// ---- Pages (HtmlService) -----------------------------------------------------------------------------------------

var PAGE_CSS =
  'body{font:1rem/1.5 system-ui,sans-serif;margin:0;color-scheme:light dark}' +
  'main{max-width:36rem;margin:0 auto;padding:1.5rem 1rem}' +
  'h1{font-size:1.5rem;line-height:1.25}' +
  'a.button,button{display:inline-block;font:inherit;padding:.6rem 1rem;border:2px solid currentColor;border-radius:.25rem;background:none;color:inherit;text-decoration:none;cursor:pointer}';

// Every link and form carries target="_top": a page inside the HtmlService sandbox frame must leave the frame.
function page_(ev, title, inner) {
  var t = ev.text;
  var pageTitle = fill_(t.pageTitle, { title: ev.title });
  var html =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc_(pageTitle) + '</title><style>' + PAGE_CSS + '</style></head><body><main>' +
    (title ? '<h1>' + esc_(title) + '</h1>' : '') + inner +
    '<p><a href="' + esc_(ev.pageUrl) + '" target="_top">' + esc_(t.back) + '</a></p></main></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(pageTitle).addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function para_(text) {
  return '<p>' + esc_(text) + '</p>';
}

function list_(items) {
  if (!items.length) return '';
  return '<ul>' + items.map(function (i) { return '<li>' + esc_(i) + '</li>'; }).join('') + '</ul>';
}

// The result of a new RSVP or a confirmed change: the same states the site shows.
function resultPage_(ev, titleKey, n, people, assigned, pending) {
  var t = ev.text;
  if (pending) return page_(ev, t.changeTitle, para_(t.changeText));
  if (n.status === 'cant') return page_(ev, t.cantTitle, para_(t.cantText));
  var inner = para_(t.doneText);
  if (ev.session) {
    var s = sessionLines_(
      ev,
      people.map(function (p, i) {
        return { name: p.name, cell: assigned[i].cell };
      }),
    );
    inner += list_(
      s.lines.map(function (l) {
        return l.slice(2);
      }),
    );
    if (s.maybe) inner += para_(s.maybeNote);
  }
  if (titleKey === 'doneTitle') inner += '<p><a class="button" href="' + esc_(ev.icsUrl) + '" target="_top">' + esc_(t.calendar) + '</a></p>';
  return page_(ev, t[titleKey], inner);
}

function errorPage_(ev, error, fields) {
  var t = ev.text;
  if (error === 'closed') return page_(ev, t.closed, '');
  if (error === 'invalid') return page_(ev, t.errInvalid, '');
  var line = esc_(t.errServer).replace('{email}', '<a href="mailto:' + esc_(ev.sender.replyTo) + '" target="_top">' + esc_(ev.sender.replyTo) + '</a>');
  return page_(ev, '', '<p>' + line + '</p>');
}

// The text for a link whose event can't be found (an expired change link): every event shares the same strings.
function anyEvent_() {
  var ss = openSheet_();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var ev = loadEvent_(sheets[i].getName());
    if (ev) return ev;
  }
  return null;
}

function expiredPage_() {
  var ev = anyEvent_();
  if (!ev) return json_({ ok: false, error: 'unknown' });
  return page_(ev, ev.text.changeExpired, '');
}

// ---- doGet -------------------------------------------------------------------------------------------------------

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.change) return confirmPage_(str_(p.change));
    var ev = loadEvent_(str_(p.slug));
    if (!ev) return json_({ ok: false, error: 'unknown' });
    var session = null;
    if (ev.session) {
      var rows = readRows_(tab_(openSheet_(), ev, false));
      var c = counts_(rows);
      var spotsLeft = c.waitlisted > 0 ? 0 : Math.max(0, ev.session.limit - c.confirmed);
      session = { spotsLeft: spotsLeft, full: spotsLeft === 0, waitlist: !!ev.session.waitlist };
    }
    return json_({ ok: true, open: !isClosed_(ev), session: session, tips: ev.tips === true ? readTips_() : [] });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  }
}

function confirmPage_(token) {
  var raw = CacheService.getScriptCache().get('chg:' + token);
  if (!raw) return expiredPage_();
  var payload = JSON.parse(raw);
  var ev = loadEvent_(payload.slug);
  if (!ev) return json_({ ok: false, error: 'unknown' });
  if (isClosed_(ev)) return errorPage_(ev, 'closed');
  var t = ev.text;
  var n = payload.submission;
  var inner =
    para_(t.changeConfirmLead) +
    list_([fill_(t.newAnswer, { status: t[n.status] })].concat(answerLines_(ev, n))) +
    '<form method="post" action="' + esc_(ScriptApp.getService().getUrl()) + '" target="_top">' +
    '<input type="hidden" name="change" value="' + esc_(token) + '">' +
    '<input type="hidden" name="mode" value="html">' +
    '<button type="submit">' + esc_(t.changeConfirm) + '</button></form>';
  return page_(ev, t.changeConfirmLead, inner);
}

// ---- doPost ------------------------------------------------------------------------------------------------------

function doPost(e) {
  var p = (e && e.parameter) || {};
  var html = p.mode === 'html';
  var ev = null;
  try {
    if (p.change) return applyChangeSafe_(str_(p.change));

    var status = p.status === 'maybe' || p.status === 'cant' ? p.status : 'going';
    if (str_(p.website) !== '') {
      if (html) {
        ev = loadEvent_(str_(p.slug));
        if (ev) return page_(ev, ev.text.doneTitle, para_(ev.text.doneText));
      }
      return json_({ ok: true, status: status, outcomes: [] });
    }

    ev = loadEvent_(str_(p.slug));
    if (!ev) return json_({ ok: false, error: 'unknown' });
    if (isClosed_(ev)) return fail_(ev, html, 'closed');
    var v = validate_(cleanInput_(p), ev);
    if (!v.ok) return fail_(ev, html, 'invalid', v.fields);
    return submit_(ev, v.normalized, html);
  } catch (err) {
    return fail_(ev, html, 'server');
  }
}

// Control characters (a newline in a name could write fake lines into a mail) are removed from every name before
// validation, so a name made only of them is an invalid (blank) name.
function cleanInput_(p) {
  var o = {};
  Object.keys(p).forEach(function (k) {
    o[k] = /^(name|g\d+name)$/.test(k) ? str_(p[k]).replace(/[\u0000-\u001f\u007f]/g, '') : p[k];
  });
  return o;
}

// The change page answers with a page even when the write fails (the old rows stay: new rows are appended first).
function applyChangeSafe_(token) {
  try {
    return applyChange_(token);
  } catch (err) {
    var ev = null;
    try {
      var raw = CacheService.getScriptCache().get('chg:' + token);
      ev = raw ? loadEvent_(JSON.parse(raw).slug) : anyEvent_();
    } catch (err2) {
      ev = null;
    }
    return ev ? errorPage_(ev, 'server') : json_({ ok: false, error: 'server' });
  }
}

function fail_(ev, html, error, fields) {
  if (html && ev) return errorPage_(ev, error, fields);
  var o = { ok: false, error: error };
  if (fields) o.fields = fields;
  return json_(o);
}

// One new RSVP, or a request to change an existing one. Everything that reads or writes the tab is in one lock.
function submit_(ev, n, html) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) return fail_(ev, html, 'busy');
  var people = peopleOf_(n);
  var assigned = null;
  var stored = null; // the existing RSVP's you row: a change request, nothing written
  try {
    var ss = openSheet_();
    var sheet = tab_(ss, ev, true);
    var rows = readRows_(sheet);
    stored = findYou_(rows, n.email);
    if (!stored) {
      assigned = assign_(ev, people, n.status, counts_(rows));
      var id = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
      appendRows_(sheet, rowsFor_(id, iso_(now_()), '', '', n, people, assigned));
    }
  } finally {
    try {
      SpreadsheetApp.flush();
    } catch (err) {
      // the original error, if any, is what the caller sees
    }
    lock.releaseLock();
  }

  if (stored) {
    requestChange_(ev, n, stored);
    return html ? resultPage_(ev, 'doneTitle', n, people, [], true) : json_({ ok: true, status: n.status, pending: true, outcomes: [] });
  }
  mailOutcome_(ev, n.email, n, people, assigned);
  if (html) return resultPage_(ev, 'doneTitle', n, people, assigned, false);
  return json_({ ok: true, status: n.status, outcomes: outcomesOf_(ev, n.status, assigned) });
}

// ---- Changes (I-064: a repeat RSVP is confirmed from the stored address's inbox) ---------------------------------

function throttleKey_(slug, email) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, slug + ' ' + email);
  return 'chgn:' + Utilities.base64Encode(bytes);
}

function requestChange_(ev, n, stored) {
  var cache = CacheService.getScriptCache();
  var key = throttleKey_(ev.slug, n.email);
  var t0 = now_();
  var count = 0;
  var seen = cache.get(key);
  if (seen) {
    var parts = seen.split(':');
    count = Number(parts[0]) || 0;
    t0 = Number(parts[1]) || t0;
  }
  if (count >= CHANGE_MAX) return; // same reply, no mail
  var left = Math.max(1, Math.ceil(CHANGE_TTL - (now_() - t0) / 1000));
  cache.put(key, count + 1 + ':' + t0, left);

  var token = Utilities.getUuid();
  var base = stored.changed || stored.submitted;
  cache.put('chg:' + token, JSON.stringify({ slug: ev.slug, email: n.email, base: base, submission: n }), CHANGE_TTL);
  mailChange_(ev, stored.email, stored.name, n, ScriptApp.getService().getUrl() + '?change=' + token);
}

function applyChange_(token) {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('chg:' + token);
  if (!raw) return expiredPage_();
  var payload = JSON.parse(raw);
  var ev = loadEvent_(payload.slug);
  if (!ev) return json_({ ok: false, error: 'unknown' });
  if (isClosed_(ev)) return errorPage_(ev, 'closed');
  var n = payload.submission;
  var people = peopleOf_(n);

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) return errorPage_(ev, 'busy');
  var assigned = null;
  var freed = 0;
  var stale = false;
  try {
    var sheet = tab_(openSheet_(), ev, false);
    var rows = readRows_(sheet);
    var you = findYou_(rows, payload.email);
    if (!you || (you.changed || you.submitted) !== payload.base) {
      stale = true;
      cache.remove('chg:' + token);
    } else {
      var mine = rows.filter(function (r) {
        return r.id === you.id;
      });
      var others = rows.filter(function (r) {
        return r.id !== you.id;
      });
      // The previous row of each person: you, then the first unused old guest with the same name.
      var oldGuests = mine.filter(function (r) {
        return r.who === 'guest';
      });
      var used = [];
      var c = counts_(others);
      var maxAll = counts_(rows).maxWait;
      people.forEach(function (person, i) {
        var prev = null;
        if (i === 0) {
          prev = you;
        } else {
          var key = person.name.trim().toLowerCase();
          for (var j = 0; j < oldGuests.length; j++) {
            if (used.indexOf(j) === -1 && oldGuests[j].name.trim().toLowerCase() === key) {
              used.push(j);
              prev = oldGuests[j];
              break;
            }
          }
        }
        if (ev.session && n.status === 'going' && person.answer === 'yes' && prev && (prev.cell === 'confirmed' || prev.cell === 'waitlist')) {
          person.keep = { cell: prev.cell, wait: prev.cell === 'waitlist' ? prev.wait : 0 };
          if (prev.cell === 'confirmed') c.confirmed++;
          else c.waitlisted++;
        }
      });
      c.maxWait = Math.max(c.maxWait, maxAll);
      assigned = assign_(ev, people, n.status, c);

      var oldConfirmed = mine.filter(function (r) {
        return r.cell === 'confirmed';
      }).length;
      var newConfirmed = assigned.filter(function (a) {
        return a.cell === 'confirmed';
      }).length;
      var waitingAfter = others.some(function (r) {
        return r.cell === 'waitlist';
      }) || assigned.some(function (a) {
        return a.cell === 'waitlist';
      });
      if (ev.session && waitingAfter && oldConfirmed > newConfirmed) freed = oldConfirmed - newConfirmed;

      appendRows_(sheet, rowsFor_(you.id, you.submitted, iso_(now_()), you.reminder, n, people, assigned));
      mine
        .map(function (r) {
          return r.n;
        })
        .sort(function (a, b) {
          return b - a;
        })
        .forEach(function (rowNumber) {
          sheet.deleteRow(rowNumber);
        });
      cache.remove('chg:' + token);
    }
  } finally {
    try {
      SpreadsheetApp.flush();
    } catch (err) {
      // the original error, if any, is what the caller sees
    }
    lock.releaseLock();
  }

  if (stale) return expiredPage_();
  mailOutcome_(ev, payload.email, n, people, assigned);
  if (freed > 0) mailSpotFreed_(ev, freed);
  return resultPage_(ev, 'changeDoneTitle', n, people, assigned, false);
}

// ---- Reminders ---------------------------------------------------------------------------------------------------

// Run every 15 minutes by the trigger setup() makes. For each event tab whose reminderAt has passed (and whose start
// has not), each going or maybe RSVP gets one reminder, built from the session cells as they are now.
function sendDueReminders() {
  var ss = openSheet_();
  ss.getSheets().forEach(function (sheet) {
    var ev = loadEvent_(sheet.getName());
    if (!ev || !ev.reminderAt) return;
    var at = now_();
    if (at < Date.parse(ev.reminderAt) || at >= Date.parse(ev.start)) return;
    remindEvent_(ss, ev);
  });
}

function remindEvent_(ss, ev) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_MS)) return;
  var due = [];
  try {
    var rows = readRows_(tab_(ss, ev, false));
    rows.forEach(function (r) {
      if (r.who !== 'you' || r.reminder || (r.status !== 'going' && r.status !== 'maybe')) return;
      var people = rows
        .filter(function (x) {
          return x.id === r.id;
        })
        .map(function (x) {
          return { name: x.name, cell: x.cell };
        });
      due.push({ id: r.id, to: r.email, name: r.name, people: people });
    });
  } finally {
    lock.releaseLock();
  }

  // One deck for the whole run (I-084): each reminder gets its own tip, none repeated until every tip has been used.
  var deck = due.length && ev.tips === true ? tipDeck_(readTips_()) : null;
  var sent = [];
  due.forEach(function (d) {
    if (MailApp.getRemainingDailyQuota() <= 0) return;
    d.tip = deck && deck.size ? deck.next() : '';
    if (mailReminder_(ev, d)) sent.push(d.id);
  });
  if (!sent.length) return;

  if (!lock.tryLock(LOCK_MS)) return; // unstamped: the next run would resend, so stamp or stop here
  try {
    var sheet = tab_(ss, ev, false);
    var stamp = iso_(now_());
    readRows_(sheet).forEach(function (r) {
      if (sent.indexOf(r.id) !== -1) sheet.getRange(r.n, C.reminder + 1, 1, 1).setValues([[stamp]]);
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function mailReminder_(ev, d) {
  var t = ev.text;
  var v = vars_(ev);
  var blocks = [fill_(t.hi, { name: d.name }), fill_(t.reminderLead, v), [fill_(t.when, v), fill_(t.where, v)].join('\n')];
  (ev.reminderInfo || []).forEach(function (b) {
    var lines = [b.title];
    if (b.text) lines.push(b.text);
    (b.items || []).forEach(function (i) {
      lines.push('- ' + i);
    });
    blocks.push(lines.join('\n'));
  });
  if (ev.session) {
    var s = sessionLines_(ev, d.people);
    var lines2 = s.lines.slice();
    if (s.maybe) lines2.push(s.maybeNote);
    blocks.push(lines2.join('\n'));
  }
  noticeBlocks_(ev).forEach(function (b) {
    blocks.push(b);
  });
  blocks.push([fill_(t.detailsLine, v), fill_(t.calendarLine, v)].join('\n'));
  if (d.tip && t.reminderTip) blocks.push(fill_(t.reminderTip, { tip: d.tip })); // plain text mail: no escaping needed
  blocks.push(fill_(t.signoff, v));
  return send_(ev, d.to, fill_(t.reminderSubject, v), blocks);
}

// ---- setup (run once by hand) ------------------------------------------------------------------------------------

// Checks SHEET_ID, replaces the reminder trigger with one every 15 minutes, logs how much mail the account may
// send today (a new Workspace account has lower limits for a while) and how many tips it can read (never a tip or the ID).
function setup() {
  var ss = openSheet_(); // throws a clear message when SHEET_ID is unset or wrong
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDueReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyMinutes(15).create();
  Logger.log('Sheet reachable: ' + (ss ? 'yes' : 'no'));
  Logger.log('Remaining daily mail quota: ' + MailApp.getRemainingDailyQuota());
  var tipsId = PropertiesService.getScriptProperties().getProperty('TIPS_SHEET_ID');
  if (!tipsId) Logger.log('TIPS_SHEET_ID not set (no tips)');
  else CacheService.getScriptCache().remove('tips'); // read the sheet now, not a result cached in the last five minutes
  Logger.log('Tips read: ' + readTips_().length);
}
