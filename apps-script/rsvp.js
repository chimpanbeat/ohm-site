// Ohm event RSVPs: the whole Apps Script web app (E3, I-049 and I-050; ARCHITECTURE section B10).
// CONTRACT FILE. Plain V8 script: no export, no import. Helpers end in "_" so Apps Script hides them from the Run menu.
//
// How it fits: the site publishes each event's public facts and every string of copy as /events/<slug>.json (the
// feed). This script reads the feed, so a new event or a copy change needs no change here. The settings are the
// Script Properties SHEET_ID (the private sheet that holds the RSVPs) and, from E6, TIPS_SHEET_ID (Brian's self-care
// tips sheet). From E13, SIGNATURE_PHONE (Brian's number, in his email signature) and HOST_PHONE (the host's number, in
// the confirmation's questions line), both optional, read at send time only. Nothing else is configured and no guest
// data, sheet ID, script ID, email address or phone number lives in the repository.
//
// Entry points: doGet (spots left, or the change-confirm page), doPost (an RSVP, a change request, or a confirmed
// change), sendDueReminders (a 15-minute trigger), setup (run once by hand).
// I-087 (E7): all mail goes through GmailApp from the events alias (see send_); the alias is never written here.
// E13: mail to guests is HTML with a plain-text body, signed with Brian's reply signature (see mail_ and signature_).

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
  // E14: only Going answers the session question; a Maybe holds no spot, so any answers sent with it are ignored.
  var asks = hasSession && (status === 'going' || !status); // no status yet: still report the missing answers

  var session;
  if (asks) {
    session = answer_(get('session'));
    if (!session) fields.push('session');
  }

  var guests = [];
  if (!cant) {
    for (var n = 1; n <= maxGuests; n++) {
      var gname = get('g' + n + 'name').trim();
      var raw = asks ? get('g' + n + 'session') : '';
      if (!gname && !raw) continue;
      var gsession = answer_(raw);
      var bad = false;
      if (!gname || gname.length > NAME_MAX) {
        fields.push('g' + n + 'name');
        bad = true;
      }
      if (asks && gname && !gsession) {
        fields.push('g' + n + 'session');
        bad = true;
      }
      if (!bad) guests.push(asks ? { name: gname, session: gsession } : { name: gname });
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
    } else if (status === 'maybe') {
      result.push({ cell: 'maybe', wait: 0 }); // E14: a Maybe has no session answers and holds no spot, for anyone
    } else if (p.keep) {
      result.push(p.keep);
    } else if (p.answer !== 'yes') {
      result.push({ cell: 'no', wait: 0 });
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
  var mail = ev.mail || {};
  return {
    title: ev.title,
    eventName: mail.name || ev.title,
    thanks: mail.thanks || '',
    dateLabel: ev.dateLabel,
    timeLabel: ev.timeLabel,
    venue: ev.venue.name,
    address: ev.venue.address,
    icsUrl: ev.icsUrl,
    googleUrl: ev.googleCalUrl || '',
    pageUrl: ev.pageUrl,
  };
}

function outcomeText_(ev, name, cell) {
  var t = ev.text;
  var w = words_(ev.session ? ev.session.label : '');
  return fill_(t.outcomeLine, { name: name, outcome: fill_(t[CELL_KEY[cell]], w) });
}

// E13: every mail to a guest is HTML with a plain-text twin, built from one list of blocks. A block is a string (its
// lines split on "\n") or an array of lines. A line is a string, { head } (a heading: bold and green in HTML, plain in
// the text) or { runs } (strings, { text, href } links and { text, tone } coloured words; in the text, a link whose words
// aren't its URL puts the URL on the next line). Only feed URLs become links; a guest's name is always escaped text.
// E14 adds { li: line } (a bullet: consecutive ones become one list) and { button: { text, href } } (a call-to-action
// button on its own line; in the text, its words and its URL on the next line).
// The colours are Brian's signature colours, copied from src/styles/tokens.css (the script can't read it; a test
// keeps them equal).
var MAIL_GREEN = '#125245'; // tokens.css --green-700
var MAIL_TERRA = '#C37A5B'; // tokens.css --terra-500
var MAIL_CTA = '#9C5739'; // tokens.css --cta-bg (--terra-700): the site's button fill; also the "No" word
var MAIL_CTA_TEXT = '#F3F2F0'; // tokens.css --cta-text (--cream)
var SIG_SEP = ' • '; // the bullet between the phone and the site (plain text)
var SIG_SEP_HTML = '&nbsp;&bull;&nbsp;';

// A template as { runs }: each {key} named in links becomes that link; the rest is filled from vars, as fill_ does.
function tpl_(template, vars, links) {
  var s = String(template);
  var runs = [];
  var last = 0;
  var re = /\{(\w+)\}/g;
  var m;
  while ((m = re.exec(s))) {
    if (!Object.prototype.hasOwnProperty.call(links, m[1])) continue;
    runs.push(fill_(s.slice(last, m.index), vars));
    runs.push(links[m[1]]);
    last = m.index + m[0].length;
  }
  runs.push(fill_(s.slice(last), vars));
  return {
    runs: runs.filter(function (r) {
      return r !== '';
    }),
  };
}

// A line that is one URL, linked.
function url_(url) {
  return { runs: [{ text: url, href: url }] };
}

// A template line whose {key} is a URL, linked (calendarLine, detailsLine, changeLinkLine).
function urlLine_(template, vars, key, url) {
  var links = {};
  links[key] = { text: url, href: url };
  return tpl_(template, vars, links);
}

function lineText_(l) {
  if (typeof l === 'string') return l;
  if ('head' in l) return str_(l.head);
  if ('li' in l) return '- ' + lineText_(l.li);
  if ('button' in l) return [l.button.text, l.button.href].join('\n');
  var text = '';
  var after = [];
  l.runs.forEach(function (r) {
    if (typeof r === 'string') {
      text += r;
    } else {
      text += r.text;
      if (r.href && r.text !== r.href) after.push(r.href);
    }
  });
  return [text].concat(after).join('\n');
}

// A coloured word: Yes in green, No in the terracotta of the site's buttons; any other tone is plain.
var TONE_COLOR = { yes: MAIL_GREEN, no: MAIL_CTA, name: 'inherit' }; // E15: a guest's name in a bullet is bold, in the text's colour

function lineHtml_(l) {
  if (typeof l === 'string') return esc_(l);
  if ('head' in l) return '<strong style="color:' + MAIL_GREEN + '">' + esc_(l.head) + '</strong>';
  if ('li' in l) return lineHtml_(l.li);
  return l.runs
    .map(function (r) {
      if (typeof r === 'string') return esc_(r);
      if (r.href) return '<a href="' + esc_(r.href) + '">' + esc_(r.text) + '</a>';
      return TONE_COLOR[r.tone] ? '<strong style="color:' + TONE_COLOR[r.tone] + '">' + esc_(r.text) + '</strong>' : esc_(r.text);
    })
    .join('');
}

// E14: a bulletproof button (a table cell carries the fill, so Outlook keeps it; no image). The site's .btn colours.
function buttonHtml_(b) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr>' +
    '<td bgcolor="' + MAIL_CTA + '" style="background:' + MAIL_CTA + ';border-radius:4px">' +
    '<a href="' + esc_(b.href) + '" style="display:inline-block;padding:12px 24px;font-family:Arial,sans-serif;font-size:16px;' +
    'font-weight:bold;line-height:20px;color:' + MAIL_CTA_TEXT + ';text-decoration:none">' + esc_(b.text) + '</a>' +
    '</td></tr></table>'
  );
}

// One block as HTML: its lines as one paragraph, but bullets as a list and a button on its own.
function blockHtml_(ls) {
  var out = '';
  var para = [];
  var items = [];
  var flushPara = function () {
    if (para.length) out += '<p style="margin:0 0 16px">' + para.join('<br>') + '</p>';
    para = [];
  };
  var flushList = function () {
    if (items.length) out += '<ul style="margin:0 0 16px;padding-left:20px">' + items.join('') + '</ul>';
    items = [];
  };
  ls.forEach(function (l) {
    if (typeof l !== 'string' && 'li' in l) {
      flushPara();
      items.push('<li>' + lineHtml_(l) + '</li>');
    } else if (typeof l !== 'string' && 'button' in l) {
      flushPara();
      flushList();
      out += buttonHtml_(l.button);
    } else {
      flushList();
      para.push(lineHtml_(l));
    }
  });
  flushPara();
  flushList();
  return out;
}

function linesOf_(b) {
  if (typeof b === 'string') return b ? b.split('\n') : [];
  return (b || []).filter(function (l) {
    return l !== '' && l !== null && l !== undefined;
  });
}

// A Script Property, trimmed; '' when unset or unreadable (a mail never fails over a phone number).
function prop_(key) {
  try {
    return str_(PropertiesService.getScriptProperties().getProperty(key)).trim();
  } catch (err) {
    return '';
  }
}

// Brian's reply signature (E13), from the feed's `signature`: name and credentials, the business linked to the site,
// then the phone (Script Property SIGNATURE_PHONE, read at send time, never stored or logged) as a tel: link, a bullet
// and the site. No phone: the site alone. An older feed without `signature` signs with the business name, as before.
function signature_(ev) {
  var s = ev.signature;
  if (!s) return { text: ev.sender.name, html: '<p style="margin:0">' + esc_(ev.sender.name) + '</p>' };
  var phone = prop_('SIGNATURE_PHONE');
  var tel = phone.replace(/[^\d+]/g, '');
  var text = [s.name + (s.credentials ? ', ' + s.credentials : ''), s.business, (phone ? phone + SIG_SEP : '') + s.label].join('\n');
  var link = 'color:' + MAIL_GREEN + ';text-decoration:none';
  var phoneHtml = '';
  if (phone) {
    phoneHtml = tel ? '<a href="tel:' + esc_(tel) + '" style="' + link + '">' + esc_(phone) + '</a>' : esc_(phone);
    phoneHtml += '<span style="color:' + MAIL_TERRA + '">' + SIG_SEP_HTML + '</span>';
  }
  var html =
    '<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:12px;line-height:16px;color:' + MAIL_GREEN + '">' +
    '<tr><td style="border-left:2px solid ' + MAIL_TERRA + ';padding-left:10px">' +
    '<div style="font-weight:bold;font-size:13px;line-height:17px">' + esc_(s.name) +
    (s.credentials ? '<span style="font-weight:normal">, ' + esc_(s.credentials) + '</span>' : '') + '</div>' +
    '<div><a href="' + esc_(s.url) + '" style="' + link + ';font-weight:bold">' + esc_(s.business) + '</a></div>' +
    '<div>' + phoneHtml + '<a href="' + esc_(s.url) + '" style="' + link + '">' + esc_(s.label) + '</a></div>' +
    '</td></tr></table>';
  return { text: text, html: html };
}

// The blocks plus the signature as { text, html }: blocks apart by a blank line (text) or as paragraphs (HTML).
function mail_(ev, blocks) {
  var list = blocks.map(linesOf_).filter(function (ls) {
    return ls.length;
  });
  var sig = signature_(ev);
  var text = list
    .map(function (ls) {
      return ls.map(lineText_).join('\n');
    })
    .concat([sig.text])
    .join('\n\n');
  var html =
    '<div>' +
    list.map(blockHtml_).join('') +
    sig.html +
    '</div>';
  return { text: text, html: html };
}

// Each inEmails notice as a block: its title (a heading when `head`), its text, its link.
function noticeBlocks_(ev, head) {
  return (ev.notices || []).map(function (n) {
    return linesOf_([n.title ? (head ? { head: n.title } : n.title) : '', n.text, n.url ? url_(n.url) : '']);
  });
}

// E13: bookHead and bookLine; E14: then bookLink as a button on its own line, linked to the feed's bookUrl. Nothing on a
// feed without bookUrl.
function bookBlock_(ev) {
  var t = ev.text;
  if (!ev.bookUrl) return [];
  return [{ head: t.bookHead }, t.bookLine, { button: { text: t.bookLink, href: ev.bookUrl } }];
}

// E14: the calendar links as one block: Google first when the feed has it, then the .ics. Older feeds: the .ics alone.
function calendarLines_(ev, v) {
  var lines = [];
  if (ev.googleCalUrl) lines.push(urlLine_(ev.text.calendarGoogleLine, v, 'googleUrl', ev.googleCalUrl));
  lines.push(urlLine_(ev.text.calendarLine, v, 'icsUrl', ev.icsUrl));
  return lines;
}

// I-087: the one send point. MailApp is rejected for outside addresses, so mail goes through GmailApp, from the
// events alias when it is a Gmail send-as address of this account. A missing or rejected alias never blocks mail.
// E13: `mail` is { text, html? }: text is the plain body; html, when present, goes as the htmlBody option.
var ALIAS_LOG = 'Mail: the events alias is not a Gmail send-as address; sent from the account address';

// The feed's sender.from when it is one of this account's Gmail aliases (ignoring case), else ''.
function fromAlias_(ev) {
  var from = ev.sender && ev.sender.from;
  if (typeof from !== 'string' || !from) return '';
  try {
    var aliases = GmailApp.getAliases();
    for (var i = 0; i < aliases.length; i++) {
      if (String(aliases[i]).toLowerCase() === from.toLowerCase()) return from;
    }
  } catch (err) {
    return '';
  }
  return '';
}

function send_(ev, to, subject, mail) {
  var body = mail.text;
  var opts = { name: ev.sender.name, replyTo: ev.sender.replyTo };
  if (mail.html) opts.htmlBody = mail.html;
  var from = fromAlias_(ev);
  if (from) opts.from = from;
  else Logger.log(ALIAS_LOG);
  try {
    GmailApp.sendEmail(to, subject, body, opts);
    return true;
  } catch (err) {
    if (!from) return false; // a mail failure never undoes an RSVP
  }
  Logger.log(ALIAS_LOG);
  delete opts.from;
  try {
    GmailApp.sendEmail(to, subject, body, opts);
    return true;
  } catch (err) {
    return false;
  }
}

// people: [{ name, cell }] for session events (cell '' = no line).
function sessionLines_(ev, people) {
  var t = ev.text;
  var lines = [];
  var maybe = false;
  people.forEach(function (p) {
    if (!CELL_KEY[p.cell]) return; // blank, or a note Brian typed: no line
    if (p.cell === 'maybe') {
      maybe = true; // E14: a Maybe has no session answer to list, only the note that it holds no spot
      return;
    }
    lines.push('- ' + outcomeText_(ev, p.name, p.cell));
  });
  return { lines: lines, maybe: maybe, maybeNote: fill_(t.maybeNote, words_(ev.session ? ev.session.label : '')) };
}

// E13: the session answer a person's cell gives in the confirmation (the text key). A Maybe holds no spot: No.
var SESSION_ANSWER = { confirmed: 'yes', waitlist: 'sessionWaitlist', full: 'no', no: 'no', maybe: 'no' };

// E14: a session answer as a coloured word (Yes green, No terracotta, Waitlist plain), for a person's cell.
function answerRun_(t, cell) {
  var key = SESSION_ANSWER[cell];
  return { text: t[key], tone: key === 'yes' || key === 'no' ? key : '' };
}

// E14: the details as blocks. First "Here's all of the details:", your RSVP and, for a Going on a session event, your
// session answer. Then, when there are guests, the Guests heading and a bullet each: their name and, for a Going on a
// session event, their session answer. A Maybe has no session lines (it holds no spot). The waitlist note comes last.
function detailsBlocks_(ev, status, people, assigned) {
  var t = ev.text;
  var w = words_(ev.session ? ev.session.label : '');
  var asks = !!ev.session && status === 'going';
  var main = [{ head: t.detailsHead }, fill_(t.yourRsvp, { status: t[status] })];
  if (asks) main.push(tpl_(t.sessionAnswer, { Session: w.Session }, { answer: answerRun_(t, assigned[0].cell) }));
  var blocks = [main];
  if (people.length > 1) {
    var guests = [{ head: t.guestsHead }];
    people.slice(1).forEach(function (p, i) {
      guests.push({ li: asks ? tpl_(t.guestLine, { Session: w.Session }, { name: { text: p.name, tone: 'name' }, answer: answerRun_(t, assigned[i + 1].cell) }) : p.name });
    });
    blocks.push(guests);
  }
  if (ev.session && assigned.some(function (a) { return a.cell === 'waitlist'; })) blocks.push(t.waitlistNote);
  return blocks;
}

// The questions line: with the host's number (Script Property HOST_PHONE, read at send time) when it and the event's
// host are both set, else the line without one.
function questionsLine_(ev) {
  var t = ev.text;
  var host = ev.mail && ev.mail.host;
  var phone = prop_('HOST_PHONE');
  return host && phone ? fill_(t.questionsHost, { host: host, hostPhone: phone }) : t.questions;
}

function mailConfirmation_(ev, to, name, status, people, assigned) {
  var t = ev.text;
  var v = vars_(ev);
  var blocks = [fill_(t.hi, { name: name }), fill_(t.confirmLead, v).trim()]
    .concat(detailsBlocks_(ev, status, people, assigned))
    .concat([[t.changeLine, url_(ev.pageUrl)], [fill_(t.when, v), fill_(t.where, v)], calendarLines_(ev, v)])
    .concat(noticeBlocks_(ev, true))
    .concat([bookBlock_(ev), questionsLine_(ev), t.seeYou]);
  send_(ev, to, fill_(t.confirmSubject, v), mail_(ev, blocks));
}

function mailCant_(ev, to, name) {
  var t = ev.text;
  var v = vars_(ev);
  var blocks = [fill_(t.hi, { name: name }), [fill_(t.cantLead, v), url_(ev.pageUrl)], bookBlock_(ev)];
  send_(ev, to, fill_(t.cantSubject, v), mail_(ev, blocks));
}

// After a new RSVP or a confirmed change: the confirmation, or the short note for can't go.
// E13: an email that can't be built (a feed older than the script, say) is skipped like one that can't be sent.
var BUILD_LOG = 'Mail: an email could not be built from the feed; nothing sent';

function mailOutcome_(ev, to, n, people, assigned) {
  try {
    if (n.status === 'cant') mailCant_(ev, to, n.name);
    else mailConfirmation_(ev, to, n.name, n.status, people, assigned);
  } catch (err) {
    Logger.log(BUILD_LOG); // a mail failure never undoes an RSVP
  }
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
  if (!ev.session || n.status !== 'going') return []; // E14: only Going answers the session question
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
  send_(
    ev,
    to,
    fill_(t.changeSubject, v),
    mail_(ev, [
      fill_(t.hi, { name: storedName }),
      fill_(t.changeLead, v),
      answer,
      [urlLine_(t.changeLinkLine, {}, 'changeUrl', changeUrl), t.changeIgnore],
    ]),
  );
}

// To Brian only: plain text, no signature (E13 leaves it as it was).
function mailSpotFreed_(ev, freed) {
  var t = ev.text;
  var v = vars_(ev);
  var w = words_(ev.session.label);
  send_(ev, ev.sender.contact || ev.sender.replyTo, fill_(t.spotFreedSubject, merge_(v, { session: w.session })), {
    text: [fill_(t.spotFreedText, { session: w.session, n: freed }), fill_(t.detailsLine, v)].join('\n\n'),
  });
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
  if (titleKey === 'doneTitle') {
    inner += '<p>';
    if (ev.googleCalUrl) inner += '<a class="button" href="' + esc_(ev.googleCalUrl) + '" target="_top">' + esc_(t.calendarGoogle) + '</a> ';
    inner += '<a class="button" href="' + esc_(ev.icsUrl) + '" target="_top">' + esc_(t.calendar) + '</a></p>';
  }
  return page_(ev, t[titleKey], inner);
}

function errorPage_(ev, error, fields) {
  var t = ev.text;
  if (error === 'closed') return page_(ev, t.closed, '');
  if (error === 'invalid') return page_(ev, t.errInvalid, '');
  var line = esc_(t.errServer).replace('{email}', '<a href="mailto:' + esc_(ev.sender.contact || ev.sender.replyTo) + '" target="_top">' + esc_(ev.sender.contact || ev.sender.replyTo) + '</a>');
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

// E14: a confirmed change leaves a marker for as long as the link would have lived (CHANGE_TTL): the event slug, the
// confirmed answer and each person's cell. A second press of Confirm (the page can take several seconds to answer), a
// second tab, or the link opened again after confirming shows the finished page instead of "expired", and sends no
// second email. Holds no guest data beyond what the first reply already showed.
function donePage_(token) {
  var raw = CacheService.getScriptCache().get('chgdone:' + token);
  if (!raw) return null;
  var done = JSON.parse(raw);
  var ev = loadEvent_(done.slug);
  if (!ev) return null;
  return resultPage_(ev, 'changeDoneTitle', done.submission, peopleOf_(done.submission), done.assigned, false);
}

function confirmPage_(token) {
  var raw = CacheService.getScriptCache().get('chg:' + token);
  if (!raw) return donePage_(token) || expiredPage_();
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
    '<button type="submit">' + esc_(t.changeConfirm) + '</button></form>' + confirmScript_(t.changeConfirming || t.changeConfirm);
  return page_(ev, t.changeConfirmLead, inner);
}

// E14: the first press locks the button and says Confirming…; a second press while the answer is on its way does
// nothing. The form still submits (the lock is set in the submit event, after the browser has built the request).
function confirmScript_(label) {
  var safe = JSON.stringify(str_(label)).replace(/</g, '\\u003c');
  return (
    '<script>(function(){var f=document.querySelector("form");if(!f)return;f.addEventListener("submit",function(e){' +
    'if(f.getAttribute("data-sent")){e.preventDefault();return;}f.setAttribute("data-sent","1");' +
    'var b=f.querySelector("button");if(b){b.disabled=true;b.textContent=' + safe + ';}});})();</script>'
  );
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
  try {
    mailChange_(ev, stored.email, stored.name, n, ScriptApp.getService().getUrl() + '?change=' + token);
  } catch (err) {
    Logger.log(BUILD_LOG);
  }
}

function applyChange_(token) {
  var cache = CacheService.getScriptCache();
  var raw = cache.get('chg:' + token);
  if (!raw) return donePage_(token) || expiredPage_();
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
      // E14: the done marker goes in before the lock opens, so a second press waiting on the lock finds it
      cache.put('chgdone:' + token, JSON.stringify({ slug: ev.slug, submission: n, assigned: assigned }), CHANGE_TTL);
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

  if (stale) return donePage_(token) || expiredPage_();
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
  noticeBlocks_(ev, false).forEach(function (b) {
    blocks.push(b);
  });
  blocks.push([urlLine_(t.detailsLine, v, 'pageUrl', ev.pageUrl)].concat(calendarLines_(ev, v)));
  if (d.tip && t.reminderTip) blocks.push(fill_(t.reminderTip, { tip: d.tip })); // escaped in the HTML part like every line
  var mail;
  try {
    mail = mail_(ev, blocks); // E13: the signature replaces the sign-off
  } catch (err) {
    Logger.log(BUILD_LOG);
    return false; // unstamped: the next run tries again
  }
  return send_(ev, d.to, fill_(t.reminderSubject, v), mail);
}

// ---- setup (run once by hand) ------------------------------------------------------------------------------------

// Checks SHEET_ID, replaces the reminder trigger with one every 15 minutes, logs how much mail the account may
// send today (a new Workspace account has lower limits for a while), how many tips it can read (never a tip or the ID)
// and, from E13, whether SIGNATURE_PHONE and HOST_PHONE are set (never a number).
function setup() {
  var ss = openSheet_(); // throws a clear message when SHEET_ID is unset or wrong
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendDueReminders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDueReminders').timeBased().everyMinutes(15).create();
  Logger.log('Sheet reachable: ' + (ss ? 'yes' : 'no'));
  Logger.log('Remaining daily mail quota: ' + MailApp.getRemainingDailyQuota());
  ss.getSheets().forEach(function (sh) {
    var slug = sh.getName();
    if (!SLUG_RE.test(slug)) return;
    var ev;
    try {
      ev = loadEvent_(slug);
    } catch (err) {
      return; // a network error on the feed skips the tab; setup still reaches the tips line
    }
    if (!ev) return;
    if (!ev.sender.from) Logger.log('From alias for ' + slug + ': not in the feed yet');
    else if (fromAlias_(ev)) Logger.log('From alias for ' + slug + ': ready');
    else Logger.log('From alias for ' + slug + ': not a Gmail send-as address (mail goes from the account address)');
    if (!ev.signature) Logger.log('Signature for ' + slug + ': not in the feed yet');
  });
  // E13: whether the two phone properties are set, never their values
  Logger.log('Signature phone: ' + (prop_('SIGNATURE_PHONE') ? 'set' : 'not set'));
  Logger.log('Host phone: ' + (prop_('HOST_PHONE') ? 'set' : 'not set'));
  var tipsId = PropertiesService.getScriptProperties().getProperty('TIPS_SHEET_ID');
  if (!tipsId) Logger.log('TIPS_SHEET_ID not set (no tips)');
  else CacheService.getScriptCache().remove('tips'); // read the sheet now, not a result cached in the last five minutes
  Logger.log('Tips read: ' + readTips_().length);
}
