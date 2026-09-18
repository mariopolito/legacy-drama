/**
 * Legacy Drama Club website - Publish button
 *
 * Lives inside the "Legacy Drama Club Website Content" Sheet (Extensions > Apps Script).
 * The website shows the last published copy of this Sheet, so edits stay private
 * until someone clicks Website > Publish changes to the website. That stamps the
 * date and time onto the Publish tab; a job on GitHub checks that stamp regularly
 * and copies the tabs to the site.
 *
 * Run setUp() once after pasting this in, then reload the Sheet.
 */

var PUBLISH_TAB = 'Publish';
// Where the live site keeps its record of the last publish. Update this if the
// site moves; it only works once GitHub Pages is switched on.
var STATUS_URL = 'https://mariopolito.github.io/legacy-drama/data/sheet-cache/meta.json';
// How soon a publish lands. Matches the schedule in .github/workflows/sheet-snapshot.yml.
var PUBLISH_DELAY = 'within the hour';
var STAMP_LABEL = 'Publish stamp';
var EDIT_KEY = 'lastEditAt';        // when anyone last changed a content tab
var PUBLISH_KEY = 'lastPublishAt';  // when someone last clicked Publish

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Website')
    .addItem('Publish changes to the website', 'publishNow')
    .addItem('Check publishing status', 'checkStatus')
    .addToUi();
  if (hasUnpublishedEdits()) {
    SpreadsheetApp.getActive().toast(
      'This Sheet has changes that are not on the website yet. ' +
      'Choose Website > Publish changes to the website when they are ready.', 'Not published', 10);
  }
}

/** Notes the time of every edit to a content tab, so status can spot unpublished work. */
function onEdit(e) {
  try {
    if (e && e.range && e.range.getSheet().getName() === PUBLISH_TAB) return;
    PropertiesService.getDocumentProperties().setProperty(EDIT_KEY, String(Date.now()));
  } catch (err) {
    // Never let bookkeeping get in the way of editing.
  }
}

function hasUnpublishedEdits() {
  var props = PropertiesService.getDocumentProperties();
  return Number(props.getProperty(EDIT_KEY) || 0) > Number(props.getProperty(PUBLISH_KEY) || 0);
}

function formatWhen(ms) {
  return Utilities.formatDate(new Date(ms), SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
    "EEE MMM d 'at' h:mm a");
}

/** Creates and formats the Publish tab. Safe to run again. */
function setUp() {
  var sheet = publishTab();
  var props = PropertiesService.getDocumentProperties();
  if (!props.getProperty(EDIT_KEY)) props.setProperty(EDIT_KEY, String(Date.now()));
  var ss = SpreadsheetApp.getActive();
  ss.toast('Publish tab ready. Reload the Sheet to get the Website menu.', 'Set up', 8);
  return sheet.getSheetId();
}

function publishTab() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(PUBLISH_TAB);
  if (!sheet) sheet = ss.insertSheet(PUBLISH_TAB, ss.getNumSheets());

  sheet.getRange('A1').setValue('Publishing to the website');
  sheet.getRange('A1').setFontSize(13).setFontWeight('bold');
  sheet.getRange('A2').setValue(
    'Your edits stay off the website until you publish them. When everything is ready, ' +
    'choose Website > Publish changes to the website. The site updates ' + PUBLISH_DELAY + '.');
  sheet.getRange('A2').setWrap(true).setFontColor('#666666');
  if (!sheet.getRange('A2').isPartOfMerge()) sheet.getRange('A2:E2').merge();
  sheet.setRowHeight(2, 46);

  sheet.getRange('A4').setValue(STAMP_LABEL).setFontWeight('bold');
  sheet.getRange('A5').setValue('Asked for by').setFontWeight('bold');
  sheet.getRange('A6').setValue('What changed').setFontWeight('bold');
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 460);

  sheet.getRange('A8').setValue(
    'Do not edit cell B4 by hand, and do not delete or rename this tab. ' +
    'The website finds the stamp by the words in A4.');
  sheet.getRange('A8').setFontColor('#999999').setFontSize(10);
  if (!sheet.getRange('A8').isPartOfMerge()) sheet.getRange('A8:E8').merge();

  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  for (var i = 0; i < existing.length; i++) existing[i].remove();
  sheet.protect().setDescription('Publish tab').setWarningOnly(true);

  sheet.getRange('A4:A6').setBackground('#f3f3f3');
  return sheet;
}

/** Stamps the Publish tab, which is what asks the website to update. */
function publishNow() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.prompt(
    'Publish to the website',
    'Everything in the Calendar, Announcements and Cast tabs will go live ' + PUBLISH_DELAY + '. ' +
    'A short note about what changed (optional):',
    ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;

  var sheet = publishTab();
  var now = new Date();
  var stamp = Utilities.formatDate(now, SpreadsheetApp.getActive().getSpreadsheetTimeZone(),
    'yyyy-MM-dd HH:mm:ss');
  sheet.getRange('B4').setNumberFormat('@').setValue(stamp);
  sheet.getRange('B5').setValue(Session.getActiveUser().getEmail() || 'a Legacy drama club editor');
  sheet.getRange('B6').setValue(answer.getResponseText() || '');
  PropertiesService.getDocumentProperties().setProperty(PUBLISH_KEY, String(now.getTime()));

  SpreadsheetApp.getActive().toast(
    'Asked the website to publish. It should be live ' + PUBLISH_DELAY + '. ' +
    'Use Website > Check publishing status to see when it lands.', 'Publishing', 10);
}

/** Compares the stamp here with what the live website has published. */
function checkStatus() {
  var ui = SpreadsheetApp.getUi();
  var asked = String(publishTab().getRange('B4').getDisplayValue() || '').trim();
  var live;
  try {
    var res = UrlFetchApp.fetch(STATUS_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('the website replied ' + res.getResponseCode());
    live = JSON.parse(res.getContentText());
  } catch (err) {
    ui.alert('Publishing status',
      'Could not reach the website just now (' + err.message + '). Try again in a few minutes.',
      ui.ButtonSet.OK);
    return;
  }

  var published = String(live.publishStamp || '').trim();
  var when = live.publishedAt ? new Date(live.publishedAt).toLocaleString() : 'unknown';
  var props = PropertiesService.getDocumentProperties();
  var lastEdit = Number(props.getProperty(EDIT_KEY) || 0);
  var message;
  if (hasUnpublishedEdits()) {
    message = 'You have changes that are NOT on the website yet. ' +
      (lastEdit ? 'The Sheet was last edited ' + formatWhen(lastEdit) + '. ' : '') +
      'Choose Website > Publish changes to the website and click OK to send them.';
    if (asked && published !== asked) {
      message += ' (Your earlier publish of ' + asked + ' is also still on its way.)';
    }
  } else if (asked && published !== asked) {
    message = 'Still publishing. You asked at ' + asked + '. The website has not picked it up yet; ' +
      'it checks regularly. Try again shortly.';
  } else if (!asked) {
    message = 'Nobody has published from this Sheet yet. The website last updated: ' + when + '.';
  } else {
    message = 'The website is up to date. Your publish of ' + asked + ' went live at ' + when +
      ', and nothing has been edited since.';
  }
  ui.alert('Publishing status', message, ui.ButtonSet.OK);
}
