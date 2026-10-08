/**
 * Maharashtra Health Connect — form webhook for Google Sheets.
 *
 * Setup (full steps in README.md):
 * 1. Create a Google Sheet. Extensions → Apps Script. Paste this file.
 * 2. Project Settings → Script properties → add WEBHOOK_SECRET = a long random string
 *    (the same value as SHEET_WEBHOOK_SECRET in Vercel).
 * 3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
 * 4. Copy the web app URL into SHEET_WEBHOOK_URL in Vercel.
 *
 * Each form goes to its own tab: Patients, Partners, Reports. Header rows are
 * created automatically; new fields are added as new columns.
 */

var TABS = { patient: 'Patients', partner: 'Partners', report: 'Reports' };

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!expected || body.secret !== expected) return json_({ ok: false, error: 'unauthorised' });

    var row = body.row || {};
    var tabName = TABS[row.form];
    if (!tabName) return json_({ ok: false, error: 'unknown_form' });

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getSheet_(tabName);
      var headers = ensureHeaders_(sheet, Object.keys(row));
      var values = headers.map(function (h) {
        var v = row[h];
        if (v === undefined || v === null) return '';
        // Stop spreadsheet formula injection (values starting with = + - @).
        v = String(v);
        return /^[=+\-@]/.test(v) ? "'" + v : v;
      });
      sheet.appendRow(values);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, leadId: row.leadId });
  } catch (err) {
    return json_({ ok: false, error: 'server_error' });
  }
}

function doGet() {
  return json_({ ok: true, service: 'form-webhook' });
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, keys) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var changed = false;
  keys.forEach(function (k) {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      changed = true;
    }
  });
  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return headers;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
