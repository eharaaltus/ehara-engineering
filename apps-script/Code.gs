/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EHARA NPD  ·  Google Sheet ⇄ App live mirror
 *  Paste this into  Extensions → Apps Script  on the NPD spreadsheet.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  WHAT THIS DOES
 *  ──────────────
 *  Postgres (the app) is the system of record. This sheet is a live two-way
 *  mirror of it.
 *
 *    App  → Sheet :  the app POSTs here whenever a product/activity changes.
 *                    We upsert the row, matched on the hidden UID column.
 *    Sheet → App  :  onEdit fires, we POST the edited row to the app, the app
 *                    validates + recomputes, then pushes the row back with the
 *                    derived columns (Days Left, Status, Health…) filled in.
 *
 *  THE ONE RULE THAT MAKES THIS SAFE
 *  ─────────────────────────────────
 *  Only HUMAN columns ever travel sheet → app (see HUMAN_COLS below). Derived
 *  columns (Days Left, Status, Progress, Health, Predicted End) are computed by
 *  the app and written DOWN into the sheet as values. If someone types over a
 *  derived cell, the next push silently corrects it. This is why the mirror
 *  can't fight itself: for every column, exactly one side is the author.
 *
 *  Days Left is deliberately NOT a formula any more. The app computes it as
 *  WORKING days (skips Sundays + the company holiday calendar), which a
 *  spreadsheet TODAY()-subtraction cannot do.
 *
 *  SETUP  (5 minutes, once)
 *  ────────────────────────
 *   1. Extensions → Apps Script. Delete anything there, paste this whole file.
 *   2. Project Settings → Script Properties → add:
 *          APP_URL      https://your-app.vercel.app
 *          SHEET_SECRET <the same long random string as NPD_SHEET_SECRET in the app's env>
 *   3. Run  ▶ setupSheet   (approve the permission prompt on first run).
 *   4. Deploy → New deployment → type "Web app"
 *          Execute as:      Me
 *          Who has access:  Anyone            ← required; SHEET_SECRET is the auth
 *      Copy the /exec URL → paste into the app's env as NPD_SHEET_WEBAPP_URL.
 *   5. Run  ▶ installTriggers   (wires the onEdit push-back).
 *
 *  "Anyone" sounds alarming but is how Apps Script web apps work: the URL is
 *  unguessable and every request must carry SHEET_SECRET or it is rejected.
 *  Rotate the secret in both places if it ever leaks.
 */

// ── Tab names ──────────────────────────────────────────────────────────────
var PRODUCTS_TAB = 'Products';
var TRACKER_TAB = 'Task_Tracker';

// ── Column layout. 1-indexed, matches lib/npd/sheet-schema.ts in the app. ───
var P = { UID: 1, SR: 2, CUSTOMER: 3, PART_NAME: 4, PART_NO: 5, START: 6, TARGET: 7,
          BASELINE: 8, DOER: 9, SUPERVISOR: 10, STATUS: 11, PROGRESS: 12, HEALTH: 13,
          OVERDUE: 14, PREDICTED: 15, SYNC: 16 };

var T = { UID: 1, SR: 2, PART_NAME: 3, STAGE: 4, CODE: 5, ACTIVITY: 6, DOER: 7,
          SUPERVISOR: 8, PLANNED: 9, DAYS_LEFT: 10, RESOLUTION: 11, COMPLETION: 12,
          STATUS: 13, LINK: 14, APPLICABILITY: 15, REASONS: 16, SYNC: 17 };

var PRODUCT_HEADERS = ['UID', 'Prod #', 'Customer', 'Part Name', 'Part No', 'Start Date',
  'Target End', 'Baseline End', 'Default Doer', 'Default Supervisor', 'Status',
  'Progress %', 'Health', 'Overdue', 'Predicted End', 'Sync'];

var TRACKER_HEADERS = ['UID', 'Prod #', 'Part Name', 'Stage', 'ID', 'Activity Plan', 'Doer',
  'Supervisor', 'Planned Date', 'Days Left', 'Resolution', 'Completion Date', 'Status',
  '2D & 3D Link', 'Applicability', 'Reasons', 'Sync'];

/** The ONLY columns a human may author. Everything else the app owns. */
var HUMAN_COLS = {
  Products: [P.SR, P.CUSTOMER, P.PART_NAME, P.PART_NO, P.START, P.TARGET, P.DOER,
             P.SUPERVISOR, P.STATUS],
  Task_Tracker: [T.DOER, T.SUPERVISOR, T.PLANNED, T.RESOLUTION, T.COMPLETION, T.LINK,
                 T.APPLICABILITY, T.REASONS],
};

var HEADER_ROW = 1;
var FIRST_DATA_ROW = 2;

// ── Theme ──────────────────────────────────────────────────────────────────
var INK = '#0f172a';
var BRAND = '#1e40af';
var HUMAN_BG = '#fffbeb'; // amber-50 — "you may type here"
var AUTO_BG = '#f8fafc';  // slate-50 — "the app owns this"

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════════

function setupSheet() {
  var ss = SpreadsheetApp.getActive();
  formatTab_(ensureTab_(ss, PRODUCTS_TAB), PRODUCT_HEADERS, HUMAN_COLS.Products, P.UID, 'Products');
  formatTab_(ensureTab_(ss, TRACKER_TAB), TRACKER_HEADERS, HUMAN_COLS.Task_Tracker, T.UID, 'Task_Tracker');
  addProductValidations_(ss.getSheetByName(PRODUCTS_TAB));
  addTrackerValidations_(ss.getSheetByName(TRACKER_TAB));
  SpreadsheetApp.getActive().toast('Sheet formatted. Now Deploy → Web app, then run installTriggers.', 'Ehara NPD', 8);
}

function ensureTab_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function formatTab_(sh, headers, humanCols, uidCol, tabName) {
  sh.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground(INK)
    .setVerticalAlignment('middle').setWrap(true);
  sh.setRowHeight(HEADER_ROW, 34);
  sh.setFrozenRows(HEADER_ROW);
  sh.setFrozenColumns(3);

  // The UID column is the join key for the whole mirror. Hide it and protect it
  // — if a user deletes a UID, that row silently forks away from the database.
  sh.hideColumns(uidCol);
  var uidRange = sh.getRange(FIRST_DATA_ROW, uidCol, sh.getMaxRows() - 1, 1);
  var existing = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getDescription() === 'NPD UID — do not edit') existing[i].remove();
  }
  var prot = uidRange.protect().setDescription('NPD UID — do not edit');
  prot.setWarningOnly(true);

  // Colour-code authorship so nobody has to read a manual to know where to type.
  var lastCol = headers.length;
  var body = sh.getRange(FIRST_DATA_ROW, 1, Math.max(sh.getMaxRows() - 1, 1), lastCol);
  body.setBackground(AUTO_BG).setFontColor(INK);
  for (var j = 0; j < humanCols.length; j++) {
    sh.getRange(FIRST_DATA_ROW, humanCols[j], Math.max(sh.getMaxRows() - 1, 1), 1)
      .setBackground(HUMAN_BG);
  }

  statusRules_(sh, tabName);
  sh.autoResizeColumns(2, lastCol - 1);
}

/** Conditional formatting on the app-written Status column. */
function statusRules_(sh, tabName) {
  var col = tabName === 'Products' ? P.HEALTH : T.STATUS;
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  var range = sh.getRange(FIRST_DATA_ROW, col, rows, 1);
  var mk = function (text, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains(text).setBackground(bg).setFontColor(fg)
      .setRanges([range]).build();
  };
  sh.setConditionalFormatRules([
    mk('Overdue', '#fee2e2', '#991b1b'),
    mk('Critical', '#fee2e2', '#991b1b'),
    mk('At Risk', '#fef3c7', '#92400e'),
    mk('On Hold', '#e2e8f0', '#475569'),
    mk('Done', '#dcfce7', '#166534'),
    mk('Good', '#dcfce7', '#166534'),
  ]);
}

function addProductValidations_(sh) {
  if (!sh) return;
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  setList_(sh.getRange(FIRST_DATA_ROW, P.STATUS, rows, 1), ['Active', 'On Hold', 'Completed', 'Cancelled']);
  sh.getRange(FIRST_DATA_ROW, P.START, rows, 1).setNumberFormat('dd-mmm-yyyy');
  sh.getRange(FIRST_DATA_ROW, P.TARGET, rows, 1).setNumberFormat('dd-mmm-yyyy');
  sh.getRange(FIRST_DATA_ROW, P.BASELINE, rows, 1).setNumberFormat('dd-mmm-yyyy');
  sh.getRange(FIRST_DATA_ROW, P.PREDICTED, rows, 1).setNumberFormat('dd-mmm-yyyy');
  sh.getRange(FIRST_DATA_ROW, P.PROGRESS, rows, 1).setNumberFormat('0"%"');
}

function addTrackerValidations_(sh) {
  if (!sh) return;
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  setList_(sh.getRange(FIRST_DATA_ROW, T.RESOLUTION, rows, 1), ['Open', 'Done', 'On Hold']);
  setList_(sh.getRange(FIRST_DATA_ROW, T.APPLICABILITY, rows, 1), ['Applicable', 'N/A', 'On Hold']);
  sh.getRange(FIRST_DATA_ROW, T.PLANNED, rows, 1).setNumberFormat('dd-mmm-yyyy');
  sh.getRange(FIRST_DATA_ROW, T.COMPLETION, rows, 1).setNumberFormat('dd-mmm-yyyy');
}

function setList_(range, values) {
  range.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build()
  );
}

function installTriggers() {
  var ss = SpreadsheetApp.getActive();
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onSheetEdit') ScriptApp.deleteTrigger(existing[i]);
  }
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getActive().toast('Live push-back is ON. Edit a yellow cell to test.', 'Ehara NPD', 6);
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHEET → APP   (installable onEdit trigger)
// ═══════════════════════════════════════════════════════════════════════════

function onSheetEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  var tab = sh.getName();
  if (tab !== PRODUCTS_TAB && tab !== TRACKER_TAB) return;

  var row = e.range.getRow();
  var col = e.range.getColumn();
  if (row < FIRST_DATA_ROW) return;

  // Ignore edits to columns the app owns — they'll be overwritten on next push
  // anyway, and forwarding them would be an echo.
  if (HUMAN_COLS[tab].indexOf(col) === -1) return;

  var uidCol = tab === PRODUCTS_TAB ? P.UID : T.UID;
  var uid = String(sh.getRange(row, uidCol).getValue() || '').trim();
  if (!uid) {
    // A brand-new row typed straight into the sheet. Creating products from the
    // sheet is intentionally NOT supported — the app assigns UUIDs and generates
    // the 36 activities, which a spreadsheet can't. Say so, loudly.
    if (tab === PRODUCTS_TAB) {
      sh.getRange(row, P.SYNC).setValue('⚠️ Add products in the app').setFontColor('#b45309');
    }
    return;
  }

  var syncCol = tab === PRODUCTS_TAB ? P.SYNC : T.SYNC;
  sh.getRange(row, syncCol).setValue('⏳').setFontColor('#64748b');

  var payload = { action: 'edit', tab: tab, uid: uid, fields: readHumanFields_(sh, row, tab) };
  var res = postToApp_(payload);

  if (res && res.ok) {
    // The app echoes back the recomputed row (Days Left, Status, Health…). Write
    // it straight in so the human sees the authoritative, workday-aware answer
    // about a second after they typed — no refresh, no formula.
    if (res.row) writeRow_(sh, row, tab, res.row);
    sh.getRange(row, syncCol).setValue('✓').setFontColor('#16a34a');
  } else {
    var msg = res && res.error ? String(res.error).slice(0, 60) : 'App unreachable';
    sh.getRange(row, syncCol).setValue('⚠️ ' + msg).setFontColor('#dc2626');
  }
}

function readHumanFields_(sh, row, tab) {
  var v = sh.getRange(row, 1, 1, tab === PRODUCTS_TAB ? PRODUCT_HEADERS.length : TRACKER_HEADERS.length)
            .getValues()[0];
  var at = function (c) { return v[c - 1]; };

  if (tab === PRODUCTS_TAB) {
    return {
      srNo: numOrNull_(at(P.SR)),
      customer: strOrNull_(at(P.CUSTOMER)),
      partName: strOrNull_(at(P.PART_NAME)),
      partNo: strOrNull_(at(P.PART_NO)),
      startDate: dateOrNull_(at(P.START)),
      targetEndDate: dateOrNull_(at(P.TARGET)),
      defaultDoerName: strOrNull_(at(P.DOER)),
      defaultSupervisorName: strOrNull_(at(P.SUPERVISOR)),
      status: strOrNull_(at(P.STATUS)),
    };
  }
  return {
    doerName: strOrNull_(at(T.DOER)),
    supervisorName: strOrNull_(at(T.SUPERVISOR)),
    plannedDate: dateOrNull_(at(T.PLANNED)),
    resolution: strOrNull_(at(T.RESOLUTION)),
    completionDate: dateOrNull_(at(T.COMPLETION)),
    drawingLink: strOrNull_(at(T.LINK)),
    applicability: strOrNull_(at(T.APPLICABILITY)),
    reasons: strOrNull_(at(T.REASONS)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  APP → SHEET   (Web App endpoint)
// ═══════════════════════════════════════════════════════════════════════════

function doPost(e) {
  var out = function (o) {
    return ContentService.createTextOutput(JSON.stringify(o))
      .setMimeType(ContentService.MimeType.JSON);
  };
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== secret_()) return out({ ok: false, error: 'bad secret' });

    switch (body.action) {
      case 'ping':    return out({ ok: true, sheet: SpreadsheetApp.getActive().getName() });
      case 'push':    return out(handlePush_(body));
      case 'pull':    return out(handlePull_());
      case 'rebuild': return out(handleRebuild_(body));
      case 'delete':  return out(handleDelete_(body));
      default:        return out({ ok: false, error: 'unknown action: ' + body.action });
    }
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/** Upsert products + tasks by UID. Rows not present in the payload are left alone. */
function handlePush_(body) {
  var ss = SpreadsheetApp.getActive();
  var lock = LockService.getScriptLock();
  // Two pushes racing would interleave appendRow() calls and shred the layout.
  if (!lock.tryLock(20000)) return { ok: false, error: 'sheet busy, retry' };
  try {
    var p = upsertMany_(ss.getSheetByName(PRODUCTS_TAB), PRODUCTS_TAB, body.products || []);
    var t = upsertMany_(ss.getSheetByName(TRACKER_TAB), TRACKER_TAB, body.tasks || []);
    SpreadsheetApp.flush();
    return { ok: true, productsWritten: p, tasksWritten: t };
  } finally {
    lock.releaseLock();
  }
}

function upsertMany_(sh, tab, rows) {
  if (!sh || !rows.length) return 0;
  var uidCol = tab === PRODUCTS_TAB ? P.UID : T.UID;
  var width = tab === PRODUCTS_TAB ? PRODUCT_HEADERS.length : TRACKER_HEADERS.length;
  var index = uidIndex_(sh, uidCol);

  // Split into updates (write in place) and inserts (one contiguous append).
  // Appending row-by-row is what makes naive Apps Script sync take 40 seconds.
  var appends = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var at = index[r.uid];
    if (at) {
      sh.getRange(at, 1, 1, width).setValues([rowValues_(tab, r)]);
    } else {
      appends.push(rowValues_(tab, r));
    }
  }
  if (appends.length) {
    var start = Math.max(sh.getLastRow() + 1, FIRST_DATA_ROW);
    if (start + appends.length > sh.getMaxRows()) {
      sh.insertRowsAfter(sh.getMaxRows(), start + appends.length - sh.getMaxRows() + 10);
    }
    sh.getRange(start, 1, appends.length, width).setValues(appends);
    paintRows_(sh, tab, start, appends.length);
  }
  return rows.length;
}

/** Re-apply the yellow/grey authorship colouring + validations to fresh rows. */
function paintRows_(sh, tab, start, n) {
  var width = tab === PRODUCTS_TAB ? PRODUCT_HEADERS.length : TRACKER_HEADERS.length;
  sh.getRange(start, 1, n, width).setBackground(AUTO_BG);
  var human = HUMAN_COLS[tab];
  for (var i = 0; i < human.length; i++) {
    sh.getRange(start, human[i], n, 1).setBackground(HUMAN_BG);
  }
  if (tab === PRODUCTS_TAB) {
    setList_(sh.getRange(start, P.STATUS, n, 1), ['Active', 'On Hold', 'Completed', 'Cancelled']);
    sh.getRange(start, P.START, n, 1).setNumberFormat('dd-mmm-yyyy');
    sh.getRange(start, P.TARGET, n, 1).setNumberFormat('dd-mmm-yyyy');
    sh.getRange(start, P.BASELINE, n, 1).setNumberFormat('dd-mmm-yyyy');
    sh.getRange(start, P.PREDICTED, n, 1).setNumberFormat('dd-mmm-yyyy');
  } else {
    setList_(sh.getRange(start, T.RESOLUTION, n, 1), ['Open', 'Done', 'On Hold']);
    setList_(sh.getRange(start, T.APPLICABILITY, n, 1), ['Applicable', 'N/A', 'On Hold']);
    sh.getRange(start, T.PLANNED, n, 1).setNumberFormat('dd-mmm-yyyy');
    sh.getRange(start, T.COMPLETION, n, 1).setNumberFormat('dd-mmm-yyyy');
  }
}

function rowValues_(tab, r) {
  if (tab === PRODUCTS_TAB) {
    return [r.uid, r.srNo, r.customer, r.partName, r.partNo, r.startDate, r.targetEndDate,
            r.baselineEndDate, r.defaultDoerName, r.defaultSupervisorName, r.status,
            r.progressPct, r.health, r.overdueCount, r.predictedEndDate, '✓'];
  }
  return [r.uid, r.srNo, r.partName, r.stage, r.code, r.activityPlan, r.doerName,
          r.supervisorName, r.plannedDate, r.daysLeft, r.resolution, r.completionDate,
          r.status, r.drawingLink, r.applicability, r.reasons, '✓'];
}

function writeRow_(sh, row, tab, r) {
  var width = tab === PRODUCTS_TAB ? PRODUCT_HEADERS.length : TRACKER_HEADERS.length;
  sh.getRange(row, 1, 1, width).setValues([rowValues_(tab, r)]);
}

/** Every human column in the sheet, for a full reconcile after bulk paste. */
function handlePull_() {
  var ss = SpreadsheetApp.getActive();
  return {
    ok: true,
    products: pullTab_(ss.getSheetByName(PRODUCTS_TAB), PRODUCTS_TAB),
    tasks: pullTab_(ss.getSheetByName(TRACKER_TAB), TRACKER_TAB),
  };
}

function pullTab_(sh, tab) {
  if (!sh || sh.getLastRow() < FIRST_DATA_ROW) return [];
  var uidCol = tab === PRODUCTS_TAB ? P.UID : T.UID;
  var n = sh.getLastRow() - HEADER_ROW;
  var width = tab === PRODUCTS_TAB ? PRODUCT_HEADERS.length : TRACKER_HEADERS.length;
  var vals = sh.getRange(FIRST_DATA_ROW, 1, n, width).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var uid = String(vals[i][uidCol - 1] || '').trim();
    if (!uid) continue;
    var fields = readHumanFieldsFromArray_(vals[i], tab);
    fields.uid = uid;
    out.push(fields);
  }
  return out;
}

function readHumanFieldsFromArray_(v, tab) {
  var at = function (c) { return v[c - 1]; };
  if (tab === PRODUCTS_TAB) {
    return { srNo: numOrNull_(at(P.SR)), customer: strOrNull_(at(P.CUSTOMER)),
      partName: strOrNull_(at(P.PART_NAME)), partNo: strOrNull_(at(P.PART_NO)),
      startDate: dateOrNull_(at(P.START)), targetEndDate: dateOrNull_(at(P.TARGET)),
      defaultDoerName: strOrNull_(at(P.DOER)), defaultSupervisorName: strOrNull_(at(P.SUPERVISOR)),
      status: strOrNull_(at(P.STATUS)) };
  }
  return { doerName: strOrNull_(at(T.DOER)), supervisorName: strOrNull_(at(T.SUPERVISOR)),
    plannedDate: dateOrNull_(at(T.PLANNED)), resolution: strOrNull_(at(T.RESOLUTION)),
    completionDate: dateOrNull_(at(T.COMPLETION)), drawingLink: strOrNull_(at(T.LINK)),
    applicability: strOrNull_(at(T.APPLICABILITY)), reasons: strOrNull_(at(T.REASONS)) };
}

/** Nuke both tabs and rewrite from the app. The "make the sheet match the app,
 *  no questions asked" button. */
function handleRebuild_(body) {
  var ss = SpreadsheetApp.getActive();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, error: 'sheet busy, retry' };
  try {
    rebuildTab_(ensureTab_(ss, PRODUCTS_TAB), PRODUCTS_TAB, PRODUCT_HEADERS, body.products || []);
    rebuildTab_(ensureTab_(ss, TRACKER_TAB), TRACKER_TAB, TRACKER_HEADERS, body.tasks || []);
    setupSheet();
    SpreadsheetApp.flush();
    return { ok: true, productsWritten: (body.products || []).length, tasksWritten: (body.tasks || []).length };
  } finally {
    lock.releaseLock();
  }
}

function rebuildTab_(sh, tab, headers, rows) {
  sh.clear();
  sh.clearConditionalFormatRules();
  sh.getRange(HEADER_ROW, 1, 1, headers.length).setValues([headers]);
  if (!rows.length) return;
  var values = rows.map(function (r) { return rowValues_(tab, r); });
  if (rows.length + 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 10 - sh.getMaxRows());
  sh.getRange(FIRST_DATA_ROW, 1, values.length, headers.length).setValues(values);
}

/** Remove rows whose UIDs the app deleted. */
function handleDelete_(body) {
  var ss = SpreadsheetApp.getActive();
  var uids = {};
  (body.uids || []).forEach(function (u) { uids[u] = true; });
  var removed = 0;
  [[ss.getSheetByName(PRODUCTS_TAB), P.UID], [ss.getSheetByName(TRACKER_TAB), T.UID]]
    .forEach(function (pair) {
      var sh = pair[0], uidCol = pair[1];
      if (!sh || sh.getLastRow() < FIRST_DATA_ROW) return;
      var vals = sh.getRange(FIRST_DATA_ROW, uidCol, sh.getLastRow() - HEADER_ROW, 1).getValues();
      // Walk bottom-up: deleting a row shifts everything below it up by one.
      for (var i = vals.length - 1; i >= 0; i--) {
        if (uids[String(vals[i][0]).trim()]) { sh.deleteRow(FIRST_DATA_ROW + i); removed++; }
      }
    });
  return { ok: true, removed: removed };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════════════

function uidIndex_(sh, uidCol) {
  var index = {};
  if (sh.getLastRow() < FIRST_DATA_ROW) return index;
  var vals = sh.getRange(FIRST_DATA_ROW, uidCol, sh.getLastRow() - HEADER_ROW, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var u = String(vals[i][0] || '').trim();
    if (u) index[u] = FIRST_DATA_ROW + i;
  }
  return index;
}

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function secret_() { return prop_('SHEET_SECRET'); }

function postToApp_(payload) {
  var url = prop_('APP_URL');
  if (!url) return { ok: false, error: 'APP_URL not set' };
  payload.secret = secret_();
  try {
    var res = UrlFetchApp.fetch(url.replace(/\/$/, '') + '/api/npd/sheet-hook', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var text = res.getContentText();
    if (code !== 200) return { ok: false, error: 'HTTP ' + code };
    return JSON.parse(text);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function strOrNull_(v) {
  var s = v === null || v === undefined ? '' : String(v).trim();
  return s === '' ? null : s;
}
function numOrNull_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}
/** Sheet dates arrive as Date objects (or as text if typed oddly). Always hand
 *  the app a plain `yyyy-mm-dd` string in the SHEET's timezone — using
 *  toISOString() here would shift IST dates back a day. */
function dateOrNull_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return null;
    return Utilities.formatDate(v, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  if (!s) return null;
  var d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return Utilities.formatDate(d, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

// ── Menu ───────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚙️ Ehara NPD')
    .addItem('Format / repair sheet', 'setupSheet')
    .addItem('Turn on live sync', 'installTriggers')
    .addToUi();
}
