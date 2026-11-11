/**
 * Ohm Bodymap: the body map filing script (ARCHITECTURE B12; I-073, I-126, I-127, I-128).
 * CONTRACT FILE: only the architect, or a step that lists it, changes it.
 *
 * A standalone Apps Script web app in the Ohm Workspace account. The /body-map page posts one map; this
 * script files a PDF and a JSON copy in Drive and answers with one of four fixed strings. Nothing else.
 *
 * Write-only is a promise this code keeps (it runs as the owner, so Google would allow more):
 *  - Drive: it opens the clients folder by ID, reads the names of its subfolders to pick one, and creates
 *    files (and, once, the unsorted folder). It never opens, lists, copies, moves, shares or deletes a file.
 *  - Replies and log lines are fixed strings. No name, date, note, folder or ID ever leaves the script.
 *  - No mail, no outside requests, no spreadsheet. tests/bodymap-script.test.ts bans those APIs by name.
 *
 * The folder ID is the Script Property CLIENTS_FOLDER_ID, typed in the editor. It is never in the repo.
 * State outside Drive (all of it, B12 Script state): the cache keys done:<id>, pdf:<id> and win, and the
 * Script Properties DAY_COUNTS (written here) and PAUSED (only read here; set and deleted by hand).
 */

var OK = '{"ok":true}';
var INVALID = '{"ok":false,"error":"invalid"}';
var BUSY = '{"ok":false,"error":"busy"}';
var SERVER = '{"ok":false,"error":"server"}';

/** Copies of bodymap.rate and bodymap.limits (src/data/bodymap.ts); a test keeps them equal. */
var RATE = { perTenMinutes: 6, perDay: 30, perNameAndDatePerDay: 3 };
var LIMITS = { pins: 60, noteChars: 140, nameChars: 80, pdfBytes: 1500000, reportBytes: 64000 };

var MAX_BODY = 2000000;
var KEYS = ['v', 'kind', 'id', 'website', 'name', 'apptDate', 'figure', 'report', 'pdf'];
var FIGURES = ['female', 'male'];
var UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
var UNSORTED = '_Unsorted_Intakes';
var TZ = 'America/Denver';
var MARKER_SECONDS = 21600;
var WINDOW_SECONDS = 600;
var FILE_NAME_CHARS = 60;
/** The page allows today -14 to +365 days; one more day each way covers a client in another time zone. */
var DAYS_BACK = 15;
var DAYS_AHEAD = 366;
var DAY_MS = 86400000;

// ---- Entry points

/** Every GET gets the same reply and touches nothing: there is nothing to read here. */
function doGet() {
  return reply_(INVALID);
}

function doPost(e) {
  try {
    if (PropertiesService.getScriptProperties().getProperty('PAUSED')) {
      console.warn('bodymap: paused');
      return reply_(BUSY);
    }
    var send = read_(e);
    if (!send) {
      console.warn('bodymap: invalid');
      return reply_(INVALID);
    }
    return reply_(file_(send));
  } catch (err) {
    console.warn('bodymap: state-error');
    return reply_(SERVER);
  }
}

/**
 * Run once by hand from the editor, as the Ohm account, after CLIENTS_FOLDER_ID is set.
 * It asks for the Drive permission, checks the folder opens, and makes the unsorted folder if it is missing.
 */
function setup() {
  var id = PropertiesService.getScriptProperties().getProperty('CLIENTS_FOLDER_ID');
  if (!id) {
    throw new Error('CLIENTS_FOLDER_ID is not set. Add it in Project Settings > Script Properties, then run setup() again.');
  }
  var parent;
  try {
    parent = DriveApp.getFolderById(id);
    parent.getName();
  } catch (err) {
    throw new Error('The clients folder is not reachable. Check CLIENTS_FOLDER_ID and that this account can open that folder.');
  }
  console.warn('bodymap: reachable');
  if (unsorted_(parent).created) {
    console.warn('bodymap: unsorted-created');
  } else {
    console.warn('bodymap: unsorted-found');
  }
}

// ---- Reading a send: size, parse, honeypot, shape, validate. Null means refuse; nothing has been touched.

function read_(e) {
  var raw = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  if (!raw || raw.length > MAX_BODY) return null;

  var d;
  try {
    d = JSON.parse(raw);
  } catch (err) {
    return null;
  }
  if (!isObject_(d)) return null;

  // Honeypot: people never see the field, so anything in it is a bot. Same reply as any other bad send.
  if (d.website !== undefined && d.website !== '') return null;

  // Shape: exactly the contract's keys. An extra key (action, fileId, list) is refused, not ignored.
  var keys = Object.keys(d);
  if (keys.length !== KEYS.length) return null;
  for (var i = 0; i < keys.length; i++) {
    if (KEYS.indexOf(keys[i]) < 0) return null;
  }

  if (d.v !== 1 || d.kind !== 'ohm-bodymap' || d.website !== '') return null;
  if (typeof d.id !== 'string' || !UUID_V4.test(d.id)) return null;
  if (typeof d.name !== 'string') return null;
  var name = d.name.trim();
  if (!name || name.length > LIMITS.nameChars) return null;
  if (!validDate_(d.apptDate)) return null;
  if (FIGURES.indexOf(d.figure) < 0) return null;

  if (!isObject_(d.report) || !Array.isArray(d.report.pins) || d.report.pins.length > LIMITS.pins) return null;
  for (var p = 0; p < d.report.pins.length; p++) {
    var pin = d.report.pins[p];
    if (!isObject_(pin)) return null;
    if (pin.note !== undefined && pin.note !== null) {
      if (typeof pin.note !== 'string' || pin.note.length > LIMITS.noteChars) return null;
    }
  }
  if (JSON.stringify(d.report).length > LIMITS.reportBytes) return null;

  if (typeof d.pdf !== 'string' || !d.pdf || d.pdf.length > LIMITS.pdfBytes) return null;
  if (!/^[A-Za-z0-9+\/]+={0,2}$/.test(d.pdf)) return null;
  var pdf;
  try {
    pdf = Utilities.base64Decode(d.pdf);
  } catch (err) {
    return null;
  }
  // The file must start with the five bytes of a PDF header: % P D F -
  if (pdf.length < 5 || pdf[0] !== 37 || pdf[1] !== 80 || pdf[2] !== 68 || pdf[3] !== 70 || pdf[4] !== 45) return null;

  return { id: d.id, name: name, apptDate: d.apptDate, pdf: pdf, json: JSON.stringify(d.report, null, 2) };
}

function isObject_(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** A real calendar date as YYYY-MM-DD, inside the window around today (Denver). */
function validDate_(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var t = utcDay_(s);
  if (new Date(t).toISOString().slice(0, 10) !== s) return false;
  var days = Math.round((t - utcDay_(today_())) / DAY_MS);
  return days >= -DAYS_BACK && days <= DAYS_AHEAD;
}

function utcDay_(s) {
  return Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

// ---- Filing: lock, replay, limits, folder, the two files, then the markers and counts. Returns the reply text.

function file_(send) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    console.warn('bodymap: busy-lock');
    return BUSY;
  }
  try {
    var cache = CacheService.getScriptCache();
    var props = PropertiesService.getScriptProperties();

    // Replay of a send that was already filed: same answer, nothing written, nothing counted.
    if (cache.get('done:' + send.id)) return OK;

    var now = Date.now();
    var today = today_();
    var win = window_(cache.get('win'), now);
    var day = dayCounts_(props.getProperty('DAY_COUNTS'), today);
    var nameKey = nameKey_(send.name, send.apptDate);
    if (win.count >= RATE.perTenMinutes) {
      console.warn('bodymap: busy-window');
      return BUSY;
    }
    if (day.n >= RATE.perDay) {
      console.warn('bodymap: busy-day');
      return BUSY;
    }
    if ((Number(day.k[nameKey]) || 0) >= RATE.perNameAndDatePerDay) {
      console.warn('bodymap: busy-name');
      return BUSY;
    }

    // A retry after the PDF was filed and the JSON failed writes only the JSON, with the PDF's sent time.
    var pdfAt = Number(cache.get('pdf:' + send.id)) || 0;
    var stem = stem_(send, pdfAt || now);
    var faults = 0;
    try {
      var folder = folderFor_(props.getProperty('CLIENTS_FOLDER_ID'), send.name);
      if (!pdfAt) {
        folder.createFile(Utilities.newBlob(send.pdf, 'application/pdf', stem + '.pdf'));
        try {
          cache.put('pdf:' + send.id, String(now), MARKER_SECONDS);
        } catch (err) {
          faults++;
        }
      }
      folder.createFile(Utilities.newBlob(send.json, 'application/json', stem + '.json'));
    } catch (err) {
      console.warn('bodymap: drive-error');
      return SERVER;
    }

    // Both files exist, so the reply is ok whatever happens below.
    try {
      cache.put('done:' + send.id, '1', MARKER_SECONDS);
    } catch (err) {
      faults++;
    }
    try {
      // The pair is whole: without this marker, a retry after done: is lost files a full second pair.
      cache.remove('pdf:' + send.id);
    } catch (err) {
      faults++;
    }
    try {
      var left = Math.max(1, Math.ceil(WINDOW_SECONDS - (now - win.t0) / 1000));
      cache.put('win', win.count + 1 + ':' + win.t0, left);
    } catch (err) {
      faults++;
    }
    try {
      day.k[nameKey] = (Number(day.k[nameKey]) || 0) + 1;
      props.setProperty('DAY_COUNTS', JSON.stringify({ d: today, n: day.n + 1, k: day.k }));
    } catch (err) {
      faults++;
    }
    if (faults) console.warn('bodymap: state-error');
    return OK;
  } finally {
    lock.releaseLock();
  }
}

/** The 10-minute window: "<count>:<t0>", t0 the epoch ms of its first counted send. */
function window_(raw, now) {
  if (raw) {
    var parts = String(raw).split(':');
    var count = Number(parts[0]) || 0;
    var t0 = Number(parts[1]) || 0;
    if (count > 0 && t0 > 0 && t0 <= now && now - t0 < WINDOW_SECONDS * 1000) return { count: count, t0: t0 };
  }
  return { count: 0, t0: now };
}

/** The day's counts. Missing, unreadable or another day's: a fresh day, so the counts reset by themselves. */
function dayCounts_(raw, today) {
  try {
    var c = JSON.parse(raw);
    if (isObject_(c) && c.d === today && typeof c.n === 'number' && c.n >= 0 && isObject_(c.k)) return { n: c.n, k: c.k };
  } catch (err) {
    // falls through to a fresh day
  }
  return { n: 0, k: {} };
}

/** The per-name count's key: a digest, so no store ever holds a name or an appointment date. */
function nameKey_(name, apptDate) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, folderKey(name) + '|' + apptDate, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + (bytes[i] & 255).toString(16)).slice(-2);
  return hex.slice(0, 16);
}

/** "<apptDate> Body map, <Name> (sent <yyyy-MM-dd HH.mm>)": the name as typed, minus what a file name can't hold. */
function stem_(send, sentMs) {
  var clean = send.name.replace(/[\/\\:*?"<>|\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, FILE_NAME_CHARS).trim();
  return send.apptDate + ' Body map, ' + clean + ' (sent ' + Utilities.formatDate(new Date(sentMs), TZ, 'yyyy-MM-dd HH.mm') + ')';
}

// ---- Folders

/**
 * The key a client folder and a typed name are compared by. A copy of folderKey in src/data/bodymap.ts,
 * kept equal by a test. Exact match only: no fuzzy matching.
 */
function folderKey(s) {
  return s
    .replace(/_/g, ' ')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exactly one subfolder with the typed name's key: there. None or several: the unsorted folder. */
function folderFor_(parentId, name) {
  var parent = DriveApp.getFolderById(parentId);
  var key = folderKey(name);
  var found = null;
  var count = 0;
  if (key) {
    var it = parent.getFolders();
    while (it.hasNext()) {
      var f = it.next();
      if (folderKey(f.getName()) === key && !f.isTrashed()) {
        found = f;
        count++;
      }
    }
  }
  return count === 1 ? found : unsorted_(parent).folder;
}

function unsorted_(parent) {
  var it = parent.getFoldersByName(UNSORTED);
  while (it.hasNext()) {
    var f = it.next();
    if (!f.isTrashed()) return { folder: f, created: false };
  }
  return { folder: parent.createFolder(UNSORTED), created: true };
}

function reply_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}
