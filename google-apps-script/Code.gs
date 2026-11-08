/**
 * WelcomeToEvent RSVP backend.
 * Deploy as a Google Apps Script Web App, executing as the sheet owner.
 * Configure access for anyone, so invited guests do not need Google accounts.
 * Never store guest information in the public GitHub repository.
 */
const SHEET_NAME = 'RSVPs';
const MAX_PARTY_SIZE = 30;
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const name = String(data.name || '').trim().slice(0, 120);
    const attending = String(data.attending || '');
    const partySize = Number(data.partySize);
    if (!name || !['Yes', 'No'].includes(attending) ||
        !Number.isInteger(partySize) ||
        (attending === 'Yes' && (partySize < 1 || partySize > MAX_PARTY_SIZE)) ||
        (attending === 'No' && partySize !== 0) ||
        data.event !== 'sabriya-pasni') {
      return json_({success:false, error:'Invalid RSVP'});
    }
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('Missing RSVPs sheet');
      // Prefix text that could be interpreted as a spreadsheet formula.
      const safeName = /^[=+\-@]/.test(name) ? "'" + name : name;
      sheet.appendRow([new Date(), safeName, attending, partySize, 'sabriya-pasni']);
    } finally {
      lock.releaseLock();
    }
    return json_({success:true});
  } catch (err) {
    console.error(err);
    return json_({success:false, error:'Unable to save RSVP'});
  }
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Timestamp','Guest Name','Attending','Party Size','Event']);
  sheet.setFrozenRows(1);
}
