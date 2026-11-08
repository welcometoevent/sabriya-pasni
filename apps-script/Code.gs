/**
 * WelcomeToEvent RSVP backend. Paste this entire file into the existing Apps Script Code.gs.
 * Deploy as Web app: Execute as Me; Who has access: Anyone.
 * Existing spreadsheet must be bound to this script OR set SPREADSHEET_ID below.
 */
const SPREADSHEET_ID = ''; // Optional: paste spreadsheet ID if script is standalone.
const SHEET_NAME = 'RSVPs';
function workbook_(){return SPREADSHEET_ID?SpreadsheetApp.openById(SPREADSHEET_ID):SpreadsheetApp.getActiveSpreadsheet();}
function ensure_(){
 const ss=workbook_(); if(!ss)throw Error('Connect the script to the RSVP spreadsheet or set SPREADSHEET_ID.');
 let sh=ss.getSheetByName(SHEET_NAME)||ss.insertSheet(SHEET_NAME);
 const headers=['Timestamp','Guest Name','RSVP','Number Attending','Edit Token','Last Updated'];
 if(sh.getLastRow()===0)sh.appendRow(headers);
 else if(sh.getLastColumn()<6){sh.getRange(1,5,1,2).setValues([headers.slice(4)]);}
 let summary=ss.getSheetByName('Dashboard')||ss.insertSheet('Dashboard');
 if(summary.getRange('A1').getValue()!=='Sabriya Pasni RSVP Dashboard'){
   summary.clear();summary.getRange('A1').setValue('Sabriya Pasni RSVP Dashboard');
   summary.getRange('A3:B8').setValues([
    ['Metric','Count'],['Responses','=COUNTA(RSVPs!B2:B)'],
    ['Accepted','=COUNTIF(RSVPs!C2:C,"Yes")'],['Declined','=COUNTIF(RSVPs!C2:C,"No")'],
    ['Total attending','=SUMIF(RSVPs!C2:C,"Yes",RSVPs!D2:D)'],
    ['Last updated','=IFERROR(MAX(RSVPs!F2:F),"")']
   ]);summary.getRange('A1:B1').setFontWeight('bold').setFontSize(15);
   summary.getRange('A3:B3').setFontWeight('bold');summary.setColumnWidths(1,2,220);
 }
 return sh;
}
function doGet(e){return ContentService.createTextOutput(JSON.stringify({success:true,message:'RSVP API running'})).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
 let output={success:false,message:'Unable to save RSVP.'},requestId='';
 try{
  const data=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
  requestId=String(data.requestId||'').slice(0,100);
  const name=String(data.name||'').trim().replace(/\s+/g,' ').slice(0,120);
  const attending=String(data.attending||'').toLowerCase();
  const guests=attending==='yes'?Number(data.guests):0;
  const token=String(data.token||'');
  if(!name||!['yes','no'].includes(attending)||!Number.isInteger(guests)||guests<0||guests>20||(attending==='yes'&&guests<1)||!/^[-_a-zA-Z0-9]{20,100}$/.test(token))throw Error('Please check the RSVP details.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
   const sh=ensure_();const last=sh.getLastRow();let row=0;
   if(last>1){const tokens=sh.getRange(2,5,last-1,1).getValues();for(let i=0;i<tokens.length;i++)if(tokens[i][0]===token){row=i+2;break;}}
   const now=new Date();
   if(row){sh.getRange(row,2,1,5).setValues([[name,attending==='yes'?'Yes':'No',guests,token,now]]);}
   else{sh.appendRow([now,name,attending==='yes'?'Yes':'No',guests,token,now]);}
   output={success:true,message:row?'Your RSVP has been updated.':'Your RSVP has been saved.',updated:!!row};
  }finally{lock.releaseLock();}
 }catch(err){output={success:false,message:String(err.message||err)};}
 const payload=JSON.stringify({type:'welcome-rsvp-result',requestId:requestId,...output}).replace(/</g,'\\u003c');
 return HtmlService.createHtmlOutput('<!doctype html><html><body><script>parent.postMessage('+payload+', "*");<\/script></body></html>');
}
