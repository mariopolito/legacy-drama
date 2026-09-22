/* ==========================================================================
   Legacy Drama Club - page builder
   Reads the files in /data and draws the pages. You should not need to edit
   this file to change content; edit the JSON files in /data instead.
   ========================================================================== */

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const link = (href, text, cls) => {
  const a = el('a', cls, text);
  a.href = href;
  if (/^https?:/i.test(href)) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return a;
};

async function loadJSON(path) {
  const res = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error(path + ' returned ' + res.status);
  try {
    return await res.json();
  } catch (err) {
    throw new Error(
      'The file ' + path + ' has a typo in it. Check for a missing comma, ' +
      'bracket or quotation mark. (' + err.message + ')'
    );
  }
}

function showError(target, err) {
  const box = el('div', 'error');
  box.textContent = 'Could not load the page content. ' + err.message;
  target.innerHTML = '';
  target.appendChild(box);
  console.error(err);
}

const slot = id => document.getElementById(id);

/* ---------- loading placeholders ----------
   While the published content is on its way, the sections it feeds show grey outlines
   the same shape as the real cards, so the page feels ready straight away.
   Each render function clears its section, which removes them. */

function skeletonBar(width, cls) {
  const bar = el('span', 'sk-bar' + (cls ? ' ' + cls : ''));
  bar.style.width = width;
  return bar;
}

function skeletonEvent(lines) {
  const card = el('div', 'event sk-card');
  const chip = el('div', 'date');
  chip.appendChild(skeletonBar('34px', 'sk-small'));
  chip.appendChild(skeletonBar('28px', 'sk-big'));
  chip.appendChild(skeletonBar('30px', 'sk-small'));
  card.appendChild(chip);
  const body = el('div', 'body');
  body.appendChild(skeletonBar('55%', 'sk-title'));
  lines.forEach(w => body.appendChild(skeletonBar(w)));
  card.appendChild(body);
  return card;
}

function showSkeleton(id, kind) {
  const host = slot(id);
  if (!host) return;
  host.innerHTML = '';
  host.setAttribute('aria-busy', 'true');
  const wrap = el('div', 'skeleton');
  wrap.setAttribute('aria-hidden', 'true');
  host.appendChild(el('p', 'sr-only', 'Loading…'));

  if (kind === 'announcements') {
    [3, 3].forEach((count, g) => {
      wrap.appendChild(skeletonBar(g ? '120px' : '190px', g ? 'sk-h3' : 'sk-h2'));
      const grid = el('div', 'announce-grid');
      for (let i = 0; i < count; i++) {
        const card = el('div', 'announce sk-card');
        card.appendChild(skeletonBar('40%', 'sk-small'));
        card.appendChild(skeletonBar('75%', 'sk-title'));
        card.appendChild(skeletonBar('90%'));
        card.appendChild(skeletonBar('60%'));
        grid.appendChild(card);
      }
      wrap.appendChild(grid);
    });
  } else if (kind === 'calendar' || kind === 'shows') {
    if (kind === 'calendar') {
      const bar = el('div', 'jump-bar');
      bar.appendChild(skeletonBar('260px', 'sk-pill'));
      bar.appendChild(skeletonBar('190px', 'sk-pill'));
      wrap.appendChild(bar);
    }
    wrap.appendChild(skeletonBar(kind === 'calendar' ? '240px' : '150px', 'sk-h2'));
    wrap.appendChild(skeletonBar('45%'));
    const list = el('div', 'events');
    const shapes = [['35%', '80%', '65%'], ['35%', '70%'], ['35%', '85%', '50%'], ['35%', '60%']];
    shapes.slice(0, kind === 'calendar' ? 4 : 2).forEach(s => list.appendChild(skeletonEvent(s)));
    wrap.appendChild(list);
  } else if (kind === 'cast') {
    ['92%', '80%', '86%'].forEach(w => wrap.appendChild(skeletonBar(w)));
    const row = el('div', 'search-row');
    row.appendChild(skeletonBar('100%', 'sk-pill sk-grow'));
    wrap.appendChild(row);
    const list = el('div', 'sk-rows');
    for (let i = 0; i < 8; i++) {
      const r = el('div', 'sk-row sk-card');
      r.appendChild(skeletonBar('22%'));
      r.appendChild(skeletonBar('26%'));
      r.appendChild(skeletonBar('12%', 'sk-pill'));
      r.appendChild(skeletonBar('30%'));
      list.appendChild(r);
    }
    wrap.appendChild(list);
  }
  host.appendChild(wrap);
}

function doneLoading(id) {
  const host = slot(id);
  if (host) host.removeAttribute('aria-busy');
}

/* Double-cast track names come from "tracks" in data/site.json, for example
   ["Coral", "Pearl"]. The first gets the coral pill, the second the violet one.
   Leave the list empty for a single cast and the track pills and filters stay hidden. */
let TRACKS = [];
const trackClass = name => {
  if (name === 'TBD') return 'tbd';
  const i = TRACKS.indexOf(name);
  return i >= 0 ? 't' + (i % 2 + 1) : 'both';
};

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* A date's title can carry extra lines. In the Sheet, Alt+Enter inside the Title
   cell starts a new line; the first line is the title and each line after it is
   a subtitle under it, such as "(Sorry parents, students only)". */
function titleParts(ev) {
  const lines = String(ev.title || '').split(/\r?\n/)
    .map(t => t.trim()).filter(Boolean);
  return { title: lines[0] || '', subs: lines.slice(1) };
}

/* ---------- published Sheet content ----------
   The calendar, announcements and cast are edited in a Google Sheet and
   published to data/sheet-cache/ as CSV. Each tab is read from there. */

// Splits CSV text into rows of cells, honouring quoted cells that contain
// commas, doubled quotes or line breaks.
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += c;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// A tab's CSV as objects keyed by the headings in row 1. Row 2 holds hints for
// editors and is skipped, as are entirely blank rows.
function sheetRows(text, required) {
  const rows = parseCSV(text);
  const heads = (rows[0] || []).map(h => h.trim());
  required.forEach(h => {
    if (!heads.includes(h)) throw new Error('the sheet has no "' + h + '" column');
  });
  return rows.slice(2)
    .map(r => Object.fromEntries(heads.map((h, i) => [h, (r[i] || '').trim()])))
    .filter(o => Object.values(o).some(Boolean));
}

/* The pages read the published copy of the Sheet in data/sheet-cache/, not the
   Sheet itself. An editor makes as many changes as they like, then clicks
   Publish in the Sheet, and a GitHub job copies the tabs here. So the site only
   ever shows finished work, and it loads from this site rather than waiting on
   Google. The files in /data are a last resort if a published copy is missing. */
const SHEET_CACHE = 'data/sheet-cache/';
let usedBackup = false;
let sheetTabs = {};   // set from "sheet" in data/site.json; empty means the JSON files are the source

async function fetchPublished(name) {
  const res = await fetch(SHEET_CACHE + name + '.csv?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('the published ' + name + ' returned ' + res.status);
  const text = (await res.text()).replace(/^﻿/, '');
  if (/^\s*</.test(text)) throw new Error('the published ' + name + ' is not CSV');
  return text;
}

// One piece of content from its published tab. `base` is the file version (or a
// promise of it), used for headings the Sheet does not hold and as the last
// resort. `transform` turns rows into the shape the page renders.
async function contentFor(name, base, required, transform) {
  // No Google Sheet hooked up for this tab yet: the JSON file is the content.
  if (!sheetTabs[name]) return base;
  const published = fetchPublished(name).catch(err => err);
  const saved = await base;
  const text = await published;
  try {
    if (text instanceof Error) throw text;
    const rows = sheetRows(text, required);
    // A tab nobody has filled in yet leaves the site files in charge, quietly.
    if (!rows.length) return saved;
    return transform(rows, saved);
  } catch (err) {
    usedBackup = true;
    console.warn('Could not read the published ' + name + ' (' + err.message + '). Showing the site files.');
    return saved;
  }
}

// Accepts 2026-11-04, 11/4/2026 or 11/4/26 and returns 2026-11-04, or null.
function isoDate(value) {
  const s = (value || '').trim();
  let y, m, d, hit;
  if ((hit = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +hit[1]; m = +hit[2]; d = +hit[3]; }
  else if ((hit = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) {
    m = +hit[1]; d = +hit[2]; y = hit[3].length === 2 ? 2000 + +hit[3] : +hit[3];
  } else return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function dateParts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    year: y, day: d,
    mon: dt.toLocaleString('en-US', { month: 'short' }),
    monthName: dt.toLocaleString('en-US', { month: 'long' }),
    weekday: dt.toLocaleString('en-US', { weekday: 'short' })
  };
}

function pickTrack(value, allowed, fallback) {
  const v = (value || '').trim().toLowerCase();
  return allowed.find(t => t.toLowerCase() === v) || fallback;
}

const sheetYes = v => /^(yes|y|true|x)$/i.test((v || '').trim());

// The date chip for an event, and a range such as "6-7" when it runs past one day.
function dateFields(date, endDate) {
  const start = dateParts(date);
  const endIso = isoDate(endDate || '');
  const end = endIso && endIso > date ? dateParts(endIso) : null;
  return {
    day: end ? start.day + '-' + end.day : String(start.day),
    month: start.mon,
    weekday: end ? start.weekday + '-' + end.weekday : start.weekday
  };
}

// Sorts a section's events by date and files them under their months.
function groupByMonth(events) {
  const months = [];
  events.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(ev => {
    const p = dateParts(ev.date);
    const name = p.monthName + ' ' + p.year;
    if (!months.length || months[months.length - 1].name !== name) months.push({ name, events: [] });
    months[months.length - 1].events.push(ev);
  });
  return months;
}

// data/calendar.json lists each section's dates in one flat "events" list, so
// nobody has to work out weekdays or month headings by hand.
function calendarFromFile(saved) {
  const calendars = (saved.calendars || []).map(cal => {
    if (cal.months) return cal;
    const events = (cal.events || []).map(ev => {
      const date = isoDate(ev.date);
      if (!date || !ev.title) return null;
      return Object.assign(
        { performance: false, track: '', blocks: [], notes: [], cast: '', studyHall: null },
        ev, { date }, dateFields(date, ev.endDate));
    }).filter(Boolean);
    return { id: cal.id, heading: cal.heading, intro: cal.intro || '', months: groupByMonth(events) };
  });
  return Object.assign({}, saved, { calendars });
}

function calendarFromSheet(rows, saved) {
  // Headings and intros still come from the file; the sheet supplies the dates.
  const sections = new Map();
  (saved.calendars || []).forEach(c =>
    sections.set(c.heading, { id: c.id, heading: c.heading, intro: c.intro || '', events: [] }));
  const firstHeading = saved.calendars && saved.calendars[0] ? saved.calendars[0].heading : 'Calendar';

  rows.forEach(r => {
    const date = isoDate(r['Date']);
    if (!date || !r['Title']) return;
    const heading = r['Section'] || firstHeading;
    if (!sections.has(heading)) sections.set(heading, { heading, intro: '', events: [] });

    const hasStudyHall = r['Study hall time'] || r['Study hall volunteer'] ||
      r['Study hall students'] || r['Study hall note'];

    sections.get(heading).events.push(Object.assign({
      date,
      performance: sheetYes(r['Performance']),
      title: r['Title'],
      track: pickTrack(r['Track'], TRACKS, ''),
      blocks: [1, 2, 3]
        .map(n => ({ time: r['Time ' + n] || '', what: r['What ' + n] || '' }))
        .filter(b => b.time || b.what),
      notes: (r['Notes'] || '').split(/\r?\n/).map(s => s.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean),
      cast: r['Cast needed'] || '',
      studyHall: hasStudyHall ? {
        time: r['Study hall time'] || '',
        volunteer: r['Study hall volunteer'] || '',
        students: r['Study hall students'] || '',
        note: r['Study hall note'] || ''
      } : null,
      titleUrl: r['Link'] || '',
      titleUrlLabel: r['Link label'] || ''
    }, dateFields(date, r['End date'])));
  });

  const calendars = [];
  sections.forEach(sec => {
    if (!sec.events.length) return;
    calendars.push({ id: sec.id, heading: sec.heading, intro: sec.intro, months: groupByMonth(sec.events) });
  });
  if (!calendars.length) throw new Error('the Calendar tab has no dates');
  return Object.assign({}, saved, { calendars });
}

function announcementsFromSheet(rows) {
  return rows
    .filter(r => r['Title'] && !/^no$/i.test(r['Show'] || ''))
    .map(r => ({
      date: r['Date'] || '', icon: r['Icon'] || '', title: r['Title'],
      detail: r['Detail'] || '', url: r['Link'] || ''
    }));
}

function castFromSheet(rows, saved) {
  // The Cast tab only names who plays each role number. Roles, ensemble tracks
  // and scenes come from data/cast.json and data/scenes.json.
  const names = new Map();
  rows.forEach(r => {
    const n = parseInt(r['Role #'], 10);
    if (n) names.set(n, (r['Student'] || '').trim());
  });
  const members = (saved.members || []).map(m =>
    names.has(+m.role) ? Object.assign({}, m, { student: names.get(+m.role) }) : m);
  return Object.assign({}, saved, { members });
}

/* ---------- shared chrome ---------- */

function renderChrome(site) {
  document.querySelectorAll('[data-site="school"]').forEach(n => n.textContent = site.school);
  document.querySelectorAll('[data-site="season"]').forEach(n => n.textContent = site.season);
  document.querySelectorAll('[data-site="showTitle"]').forEach(n => n.textContent = site.showTitle);

  const footer = slot('footer-note');
  if (footer && site.footerNote) footer.textContent = site.footerNote;

  // Optional feedback link, placed just above the motto. Delete the "feedback"
  // block from data/site.json and it disappears from every page.
  if (footer && site.feedback && site.feedback.url) {
    const row = el('p', 'footer-feedback');
    row.appendChild(link(site.feedback.url, '💬  ' + (site.feedback.label || 'Share feedback') + ' »'));
    footer.parentNode.insertBefore(row, footer);
  }

  const contacts = slot('contacts');
  if (contacts && Array.isArray(site.contacts)) {
    contacts.innerHTML = '';
    site.contacts.forEach(c => {
      const card = el('div', 'contact-card');
      card.appendChild(el('div', 'label', (c.icon ? c.icon + '  ' : '') + c.label));
      const value = el('div', 'value');
      value.appendChild(c.url ? link(c.url, c.name) : document.createTextNode(c.name));
      card.appendChild(value);
      if (c.detail) card.appendChild(el('div', 'detail', c.detail));
      contacts.appendChild(card);
    });
  }
}

/* ---------- announcements ---------- */

function upcomingEvents(calendarData, count) {
  const today = todayISO();
  const all = [];
  (calendarData.calendars || []).forEach(cal =>
    (cal.months || []).forEach(month =>
      (month.events || []).forEach(ev => all.push(ev))));
  return all
    .filter(ev => ev.date && ev.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, count);
}

function renderAnnouncements(site, calendarData) {
  const host = slot('announcements');
  if (!host || !site.announcements) return;
  const a = site.announcements;
  host.innerHTML = '';
  host.appendChild(el('h2', null, a.heading || 'Announcements'));

  const grid = el('div', 'announce-grid');
  (a.items || []).forEach(item => {
    const card = el('div', 'announce');
    if (item.date) card.appendChild(el('div', 'when', item.date));
    card.appendChild(el('div', 'title', (item.icon ? item.icon + '  ' : '') + item.title));
    if (item.detail) {
      const d = el('div', 'detail');
      d.appendChild(item.url ? link(item.url, item.detail) : document.createTextNode(item.detail));
      card.appendChild(d);
    }
    grid.appendChild(card);
  });
  if (grid.children.length) host.appendChild(grid);

  if (!calendarData) return;

  host.appendChild(el('h3', null, a.upcomingHeading || 'Coming up'));
  const next = upcomingEvents(calendarData, a.upcomingCount || 3);

  if (!next.length) {
    host.appendChild(el('p', 'section-intro', a.upcomingEmpty || 'Nothing on the calendar right now.'));
    return;
  }

  const upGrid = el('div', 'announce-grid');
  next.forEach((ev, i) => {
    const card = el('div', 'announce' + (ev.performance ? ' is-show' : '') + (i === 0 ? ' is-next' : ''));
    const when = el('div', 'when');
    when.textContent = [ev.month, ev.day].filter(Boolean).join(' ') +
      (ev.weekday ? '  ·  ' + ev.weekday : '');
    card.appendChild(when);
    card.appendChild(el('div', 'title', titleParts(ev).title));
    (ev.blocks || []).forEach(b => {
      const line = el('div', 'detail');
      line.appendChild(el('strong', null, b.time));
      line.appendChild(document.createTextNode('  ' + (b.what || '')));
      card.appendChild(line);
    });
    card.appendChild(link('calendar.html', 'See the calendar »', 'more'));
    upGrid.appendChild(card);
  });
  host.appendChild(upGrid);
}

/* ---------- links ---------- */

function renderLinks(data) {
  const host = slot('links');
  if (!host) return;
  host.innerHTML = '';
  host.appendChild(el('h2', null, data.heading || 'Links & Folders'));
  (data.groups || []).forEach(group => {
    host.appendChild(el('h3', null, group.title));
    const grid = el('div', 'link-grid' + (group.id ? ' ' + group.id : ''));
    (group.links || []).forEach(l => {
      const card = link(l.url, null, 'link-card');
      const title = el('div', 'title');
      title.textContent = (l.icon ? l.icon + '  ' : '') + l.title + ' ';
      title.appendChild(el('span', 'arrow', '»'));
      card.appendChild(title);
      if (l.note) card.appendChild(el('div', 'note', l.note));
      grid.appendChild(card);
    });
    host.appendChild(grid);
  });
}

/* ---------- calendar ---------- */

// Study hall only appears when a volunteer is named. With just a few students
// in study hall, parents no longer sign up, so an empty slot shows nothing.
// The students list is not shown; it only keeps the name picker from telling
// those students to stay home.
/* Study hall shows only when the Sheet says something about it. Put a parent's
   name in "Study hall volunteer" and it shows their name; write "Needed" and it
   shows a sign-up link for that date until someone's name replaces it; leave it
   blank and nothing shows at all. The link is dropped once the date has passed. */
const WANTS_VOLUNTEER = /^(needed|need a volunteer|needs a volunteer|sign ?up|open|tbd|\?)$/i;

function renderStudyHall(sh, site, isPast) {
  if (!sh) return null;
  const name = (sh.volunteer || '').trim();
  const wanted = WANTS_VOLUNTEER.test(name);
  if (!name || name.toLowerCase() === 'none') {
    return sh.note ? el('div', 'study study-note', sh.note) : null;
  }
  if (wanted && isPast) return null;

  const row = el('div', 'study');
  row.appendChild(el('span', 'study-label', (site && site.helpLabel || 'Study hall') + (sh.time ? ' ' + sh.time : '')));
  if (wanted) {
    row.appendChild(el('span', 'study-open', 'Needs a volunteer'));
    const url = site && (site.helpSignupUrl || site.studyHallSignupUrl);
    if (url) row.appendChild(link(url, 'Sign up »', 'study-link'));
  } else {
    row.appendChild(el('span', 'study-name', name));
  }
  if (sh.note) row.appendChild(el('div', 'study-note', sh.note));
  return row;
}

/* ---------- who is called to each rehearsal ---------- */

// The call schedule names students by role number, the way the director's
// schedule does: "Role #s 1, 4, 11–16 (Ariel, Ursula, Mersisters)", "ALL CAST"
// or "NO CAST CALLED". The words in brackets are for people; the numbers before
// them are what counts. Returns 'all', 'none', 'unposted' or a Set of numbers.
function calledRoles(list) {
  const raw = (list || '').trim();
  if (!raw) return 'unposted';
  if (/\ball\s+cast\b|^all$/i.test(raw)) return 'all';
  if (/\bno\s+cast\b|^none$/i.test(raw)) return 'none';
  const nums = new Set();
  raw.split('(')[0].replace(/role\s*#s?/ig, '')
    .replace(/(\d+)\s*[–—-]\s*(\d+)/g, (m, a, b) => {
      for (let n = +a; n <= +b; n++) nums.add(n);
      return ' ';
    })
    .replace(/\d+/g, n => { nums.add(+n); return ' '; });
  return nums;
}

// Everyone on the cast list, by role number. Before casting a student is known by
// their number and role ("#5 Sebastian"); once named, by their name.
function castPeople(castData) {
  return (castData && castData.members ? castData.members : [])
    .filter(m => m.role)
    .map(m => {
      const tag = '#' + m.role + ' ' + m.name;
      const student = (m.student || '').trim();
      return {
        key: String(m.role), num: +m.role, named: !!student,
        label: student ? student + ' (' + tag + ')' : tag,
        first: student ? student.split(/\s+/)[0] : tag
      };
    });
}

// Where a person stands for one event: 'yes', 'no', 'none' (nobody is called)
// or 'unposted'.
function callStatus(ev, person) {
  const called = calledRoles(ev.cast);
  if (called === 'all') return 'yes';
  if (called === 'none' || called === 'unposted') return called;
  return called.has(person.num) ? 'yes' : 'no';
}

// "Cast needed" as the director wrote it.
function renderCastNeeded(list) {
  const raw = (list || '').trim();
  if (!raw || calledRoles(raw) === 'none') return null;
  const row = el('div', 'cast-needed');
  row.appendChild(el('span', 'cast-needed-label', 'Cast needed'));
  row.appendChild(document.createTextNode(' ' + raw));
  return row;
}

function applyCastFilter(cards, person) {
  cards.forEach(({ card, ev, note }) => {
    card.classList.remove('is-called', 'is-not-called');
    note.hidden = true;
    note.className = 'call-note';
    if (!person) return;
    const status = callStatus(ev, person);
    const say = (cls, text) => { note.textContent = text; note.classList.add(cls); note.hidden = false; };
    if (status === 'yes') {
      card.classList.add('is-called');
      say('is-yes', '✓ ' + person.first + ' is needed');
    } else if (status === 'no') {
      card.classList.add('is-not-called');
      say('is-no', person.first + ' is not needed at this rehearsal');
    } else if (status === 'none') {
      card.classList.add('is-not-called');
      say('is-no', 'No rehearsal for anyone');
    } else if (!card.classList.contains('is-past')) {
      say('is-unposted', 'Call list not posted yet');
    }
  });
}

function renderCalendars(data, site, castData) {
  const host = slot('calendars');
  if (!host) return;
  host.innerHTML = '';
  const today = todayISO();
  let nextMarked = false;
  let nextCard = null;
  const people = castPeople(castData);
  const cards = [];

  const jumpBar = el('div', 'jump-bar');

  let picker = null;
  if (people.length) {
    const label = el('label', 'cast-picker');
    label.appendChild(el('span', 'cast-picker-label', 'Show rehearsals for'));
    picker = el('select');
    picker.appendChild(new Option('Everyone', ''));
    // Students by name once they are cast, then any roles still waiting, by number.
    people
      .slice()
      .sort((a, b) => (b.named - a.named) || (a.named ? a.label.localeCompare(b.label) : a.num - b.num))
      .forEach(p => picker.appendChild(new Option(p.label, p.key)));
    label.appendChild(picker);
    jumpBar.appendChild(label);
  }

  const jump = el('button', 'jump', '↓  Jump to what is next');
  jump.type = 'button';
  jumpBar.appendChild(jump);
  host.appendChild(jumpBar);

  (data.calendars || []).forEach(cal => {
    const section = el('section');
    if (cal.id) section.id = 'cal-' + cal.id;
    section.appendChild(el('h2', null, cal.heading));
    if (cal.intro) section.appendChild(el('p', 'section-intro', cal.intro));

    (cal.months || []).forEach(month => {
      const events = month.events || [];
      const done = events.length > 0 && events.every(ev => ev.date && ev.date < today);

      const box = el('details', 'month' + (done ? ' is-done' : ''));
      box.open = !done;
      const head = el('summary', 'month-label');
      head.appendChild(el('span', 'month-name', month.name));
      head.appendChild(el('span', 'month-count',
        done ? events.length + ' dates · all done' : events.length + ' dates'));
      box.appendChild(head);

      const list = el('div', 'events');

      events.forEach(ev => {
        const isPast = !!(ev.date && ev.date < today);
        const card = el('article', 'event' + (ev.performance ? ' is-show' : ''));
        if (isPast) {
          card.classList.add('is-past');
        } else if (ev.date && !nextMarked) {
          card.classList.add('is-next');
          card.id = 'next';
          nextMarked = true;
          nextCard = card;
        }

        const chip = el('div', 'date');
        chip.appendChild(el('div', 'mon', ev.month || ''));
        chip.appendChild(el('div', 'num', ev.day || ''));
        if (ev.weekday) chip.appendChild(el('div', 'wd', ev.weekday));
        card.appendChild(chip);

        const body = el('div', 'body');
        const line = el('div', 'head');
        if (ev.performance) line.appendChild(el('span', 'badge', '★ Performance'));
        if (card.classList.contains('is-next')) line.appendChild(el('span', 'badge next', 'Next up'));
        const parts = titleParts(ev);
        line.appendChild(el('span', 'title', parts.title));
        if (ev.track) {
          line.appendChild(el('span', 'track track-' + trackClass(ev.track), ev.track));
        }
        body.appendChild(line);
        parts.subs.forEach(text => body.appendChild(el('div', 'subtitle', text)));

        if (ev.titleUrl) {
          const p = el('div', 'event-link');
          p.appendChild(link(ev.titleUrl, (ev.titleUrlLabel || 'More info') + ' »'));
          body.appendChild(p);
        }

        const note = el('div', 'call-note');
        note.hidden = true;
        body.appendChild(note);

        if ((ev.blocks || []).length) {
          const blocks = el('div', 'blocks');
          ev.blocks.forEach(b => {
            blocks.appendChild(el('div', 'btime', b.time || ''));
            blocks.appendChild(el('div', 'bwhat', b.what || ''));
          });
          body.appendChild(blocks);
        }

        // Notes: one bullet per line. A line that is only a time, such as
        // "2:00-3:30pm", starts a new group with that time as its heading.
        const lines = (ev.notes || []).map(n => (n || '').trim()).filter(Boolean);
        if (lines.length) {
          const notes = el('div', 'notes');
          let ul = null;
          lines.forEach(text => {
            if (/^\d{1,2}(:\d{2})?\s*[-–]\s*\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(text)) {
              notes.appendChild(el('div', 'notes-time', text));
              ul = null;
              return;
            }
            if (!ul) { ul = el('ul'); notes.appendChild(ul); }
            ul.appendChild(el('li', null, text));
          });
          body.appendChild(notes);
        }

        const castRow = renderCastNeeded(ev.cast);
        if (castRow) body.appendChild(castRow);

        const sh = renderStudyHall(ev.studyHall || ev.helpers, site, isPast);
        if (sh) body.appendChild(sh);

        card.appendChild(body);
        list.appendChild(card);
        cards.push({ card, ev, note });
      });
      box.appendChild(list);
      section.appendChild(box);
    });
    host.appendChild(section);
  });

  const goToNext = () => {
    if (!nextCard) return;
    // The date may sit inside a month that folded itself shut.
    const month = nextCard.closest('details.month');
    if (month) month.open = true;
    nextCard.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (nextCard) {
    jump.addEventListener('click', goToNext);
    if (location.hash === '#next') setTimeout(goToNext, 120);
  } else {
    jump.remove();
    if (!picker) jumpBar.remove();
  }

  if (picker) {
    const KEY = 'legacy-calendar-cast';
    const choose = name => {
      const person = people.find(p => p.key === name) || null;
      applyCastFilter(cards, person);
      host.classList.toggle('is-filtered', !!person);
    };
    picker.addEventListener('change', () => {
      choose(picker.value);
      try { localStorage.setItem(KEY, picker.value); } catch (e) { /* storage unavailable */ }
    });
    let saved = '';
    try { saved = localStorage.getItem(KEY) || ''; } catch (e) { /* storage unavailable */ }
    if (saved && people.some(p => p.key === saved)) {
      picker.value = saved;
      choose(saved);
    }
  }
}

/* ---------- performances ---------- */

function renderPerformances(data, site) {
  const host = slot('performances');
  if (!host) return;
  host.innerHTML = '';
  const today = todayISO();

  const shows = [];
  (data.calendars || []).forEach(cal =>
    (cal.months || []).forEach(month =>
      (month.events || []).forEach(ev => {
        if (ev.performance) shows.push(ev);
      })));
  shows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const upcoming = shows.filter(ev => !ev.date || ev.date >= today);
  const past = shows.filter(ev => ev.date && ev.date < today);

  const card = ev => {
    const box = el('article', 'event is-show' + (ev.date && ev.date < today ? ' is-past' : ''));
    const chip = el('div', 'date');
    chip.appendChild(el('div', 'mon', ev.month || ''));
    chip.appendChild(el('div', 'num', ev.day || ''));
    if (ev.weekday) chip.appendChild(el('div', 'wd', ev.weekday));
    box.appendChild(chip);

    const body = el('div', 'body');
    const head = el('div', 'head');
    head.appendChild(el('span', 'badge', '★ Performance'));
    const parts = titleParts(ev);
    head.appendChild(el('span', 'title', parts.title));
    if (ev.track) {
      head.appendChild(el('span', 'track track-' + trackClass(ev.track), ev.track));
    }
    body.appendChild(head);
    parts.subs.forEach(text => body.appendChild(el('div', 'subtitle', text)));
    if ((ev.blocks || []).length) {
      const blocks = el('div', 'blocks');
      ev.blocks.forEach(b => {
        blocks.appendChild(el('div', 'btime', b.time || ''));
        blocks.appendChild(el('div', 'bwhat', b.what || ''));
      });
      body.appendChild(blocks);
    }
    box.appendChild(body);
    return box;
  };

  const section = el('section');
  section.appendChild(el('h2', null, 'Show dates'));
  const intro = el('p', 'section-intro');
  intro.appendChild(document.createTextNode('See '));
  intro.appendChild(link('calendar.html', 'calendar'));
  intro.appendChild(document.createTextNode(' for rehearsal dates and times'));
  section.appendChild(intro);

  if (upcoming.length) {
    const list = el('div', 'events');
    upcoming.forEach((ev, i) => {
      const box = card(ev);
      if (i === 0) box.classList.add('is-next');
      list.appendChild(box);
    });
    section.appendChild(list);
  } else {
    section.appendChild(el('p', 'section-intro', 'No performances are scheduled right now.'));
  }
  host.appendChild(section);

  if (past.length) {
    const done = el('section');
    const box = el('details', 'month is-done');
    const head = el('summary', 'month-label');
    head.appendChild(el('span', 'month-name', 'Already performed'));
    head.appendChild(el('span', 'month-count', past.length + (past.length === 1 ? ' show' : ' shows')));
    box.appendChild(head);
    const list = el('div', 'events');
    past.forEach(ev => list.appendChild(card(ev)));
    box.appendChild(list);
    done.appendChild(box);
    host.appendChild(done);
  }

}

/* ---------- cast ---------- */

// King Triton's trident, used beside the cast intro on a wide screen and as a
// faint watermark behind it on a phone.
const TRIDENT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 300" focusable="false">' +
  '<path d="M60 0 72 30H65V92H55V30H48Z' +
  'M14 18 25 44H19V82H101V44H95L106 18 117 44H111V92H9V44H3Z' +
  'M53 92H67V300H53Z M44 104H76V116H44Z" fill="currentColor"/></svg>';

// "Meet the characters": one card per role, grouped as the cast.json file groups them.
function renderCharacters(chars) {
  const section = el('section', 'characters');
  section.id = 'characters';
  section.appendChild(el('h2', null, chars.heading || 'Meet the characters'));
  if (chars.intro) section.appendChild(el('p', 'section-intro', chars.intro));
  (chars.groups || []).forEach(group => {
    section.appendChild(el('h3', null, group.title));
    const grid = el('div', 'character-grid');
    (group.items || []).forEach(c => {
      const card = el('article', 'character');
      const head = el('div', 'character-head');
      if (c.icon) head.appendChild(el('span', 'character-icon', c.icon));
      head.appendChild(el('span', 'character-name', c.name));
      card.appendChild(head);
      if ((c.tags || []).length) {
        const tags = el('div', 'character-tags');
        c.tags.forEach(t => tags.appendChild(el('span', 'tag', t)));
        card.appendChild(tags);
      }
      if (c.description) card.appendChild(el('p', 'character-desc', c.description));
      grid.appendChild(card);
    });
    section.appendChild(grid);
  });
  return section;
}

/* ---------- scenes, shared by the Cast and Scenes pages ---------- */

// For each role number, the scenes they are in and who they play in each one,
// worked out from the characters listed under every scene in data/scenes.json.
function scenesByRole(sceneData) {
  const map = new Map();
  (sceneData && sceneData.scenes || []).forEach(sc => {
    (sc.characters || []).forEach(c => (c.roles || []).forEach(n => {
      if (!map.has(n)) map.set(n, new Map());
      const mine = map.get(n);
      if (!mine.has(sc.n)) mine.set(sc.n, { scene: sc, as: [] });
      if (!mine.get(sc.n).as.includes(c.name)) mine.get(sc.n).as.push(c.name);
    }));
  });
  const out = new Map();
  map.forEach((mine, n) => out.set(n, [...mine.values()].sort((a, b) => a.scene.n - b.scene.n)));
  return out;
}

const sceneLabel = sc => (sc.n > 20 ? '' : 'Scene ' + sc.n + ' · ') + sc.name;

// The video id in a YouTube address (youtu.be/ID, youtube.com/watch?v=ID,
// /embed/ID or /shorts/ID), or null for anything else.
function youtubeId(url) {
  const m = String(url || '').match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

// Only one practice track plays at a time, anywhere on the page.
let openPlayer = null;
function closePlayer() {
  if (!openPlayer) return;
  openPlayer.box.remove();
  openPlayer.button.classList.remove('is-playing');
  openPlayer.button.setAttribute('aria-expanded', 'false');
  openPlayer = null;
}

// Opens a YouTube practice track in a player under its song, or closes it if it
// is already open. Ctrl- or Cmd-click still opens YouTube in a new tab.
function playInline(a, li, url, label) {
  const id = youtubeId(url);
  if (!id) return;
  a.setAttribute('aria-expanded', 'false');
  a.addEventListener('click', e => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const same = openPlayer && openPlayer.button === a;
    closePlayer();
    if (same) return;
    const box = el('div', 'song-player');
    const frame = el('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
    frame.title = label;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    box.appendChild(frame);
    const foot = el('div', 'song-player-foot');
    foot.appendChild(link(url, 'Open on YouTube ↗', 'song-player-out'));
    const close = el('button', 'song-player-close', 'Close ✕');
    close.type = 'button';
    close.addEventListener('click', () => { closePlayer(); a.focus(); });
    foot.appendChild(close);
    box.appendChild(foot);
    li.appendChild(box);
    a.classList.add('is-playing');
    a.setAttribute('aria-expanded', 'true');
    openPlayer = { box, button: a };
  });
}

// A song with its two practice tracks, or a note that none is posted yet. With
// embed, the tracks play on the page instead of sending the student to YouTube.
function songLine(song, opts) {
  const li = el('li', 'song');
  li.appendChild(el('span', 'song-title', '🎵 ' + song.title));
  const links = el('span', 'song-links');
  [[song.vocals, 'With vocals', 'song-link'], [song.track, 'Accompaniment', 'song-link is-track']]
    .forEach(([url, label, cls]) => {
      if (!url) return;
      const a = link(url, label, cls);
      if (opts && opts.embed) playInline(a, li, url, song.title + ' - ' + label.toLowerCase());
      links.appendChild(a);
    });
  if (!song.vocals && !song.track) links.appendChild(el('span', 'song-none', 'Practice track coming'));
  li.appendChild(links);
  return li;
}

// One person's scenes as a list, each with the part they play and its songs.
function sceneList(apps, opts) {
  const list = el('ol', 'my-scenes');
  apps.forEach(({ scene, as }) => {
    const li = el('li');
    const head = el('div', 'my-scene-head');
    const title = opts && opts.link
      ? link('scenes.html#scene-' + scene.n, sceneLabel(scene), 'my-scene-name')
      : el('strong', 'my-scene-name', sceneLabel(scene));
    head.appendChild(title);
    head.appendChild(el('small', null, 'as ' + as.join(', ')));
    li.appendChild(head);
    if ((scene.songs || []).length) {
      const songs = el('ul', 'songs');
      scene.songs.forEach(s => songs.appendChild(songLine(s)));
      li.appendChild(songs);
    }
    list.appendChild(li);
  });
  return list;
}

function renderCast(data, sceneData) {
  const host = slot('cast');
  if (!host) return;
  host.innerHTML = '';

  const head = el('div', 'cast-head');
  const intro = el('div', 'cast-intro');
  intro.appendChild(el('h2', null, data.heading || 'Cast'));
  const mark = el('div', 'cast-watermark');
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = TRIDENT_SVG;
  intro.appendChild(mark);
  (data.intro || []).forEach(p => intro.appendChild(el('p', null, p)));
  const banner = el('div', 'cast-banner');
  banner.setAttribute('aria-hidden', 'true');
  banner.innerHTML = TRIDENT_SVG;
  head.appendChild(intro);
  head.appendChild(banner);
  host.appendChild(head);

  const section = el('section', 'cast-list');
  section.id = 'cast-list';
  section.appendChild(el('h2', null, data.listHeading || 'Cast & scenes'));
  renderCastTable(section, data, scenesByRole(sceneData));
  host.appendChild(section);

  if (data.characters) host.appendChild(renderCharacters(data.characters));
}

// One row per role number: who plays it, what else they play, and their scenes,
// which open into the songs in each one with links to the practice tracks.
function renderCastTable(host, data, byRole) {
  const members = (data.members || []).filter(m => m.role);

  const controls = el('div', 'search-row');
  const input = el('input');
  input.type = 'search';
  input.placeholder = 'Search by student, role or number…';
  input.setAttribute('aria-label', 'Search the cast list');
  controls.appendChild(input);
  const toggle = el('button', 'filter', 'Open every scene list');
  toggle.type = 'button';
  controls.appendChild(toggle);
  const count = el('div', 'count');
  controls.appendChild(count);
  host.appendChild(controls);

  const scroll = el('div', 'table-scroll');
  const table = el('table', 'cast roster');
  const thead = el('thead');
  const hr = el('tr');
  ['#', 'Student', 'Role', 'Scenes & songs'].forEach(h => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr);
  table.appendChild(thead);
  scroll.appendChild(table);
  host.appendChild(scroll);

  let group = null;
  const rows = members.map(m => {
    if (m.group && m.group !== group) {
      group = m.group;
      const gb = el('tbody', 'roster-group');
      const gr = el('tr');
      const gh = el('th', null, group);
      gh.colSpan = 4;
      gr.appendChild(gh);
      gb.appendChild(gr);
      table.appendChild(gb);
    }
    const body = el('tbody', 'member');
    const tr = el('tr', 'first');

    tr.appendChild(el('td', 'num', '#' + m.role));

    const who = el('td', 'actor');
    const student = (m.student || '').trim();
    const nameLink = link('scenes.html?role=' + m.role, student || 'To be cast', 'actor-name' + (student ? '' : ' is-tbc'));
    nameLink.title = 'See every scene for #' + m.role;
    who.appendChild(nameLink);
    tr.appendChild(who);

    const role = el('td', 'role');
    role.setAttribute('data-label', 'Role');
    role.appendChild(el('span', 'role-name', m.name));
    (m.also || []).forEach(a => role.appendChild(el('small', 'role-also', a)));
    tr.appendChild(role);

    const apps = byRole.get(+m.role) || [];
    const songCount = apps.reduce((n, a) => n + (a.scene.songs || []).length, 0);
    const cell = el('td', 'desc scenes-cell');
    if (apps.length) {
      const box = el('details', 'my-scenes-box');
      const sum = el('summary');
      sum.appendChild(el('strong', null, apps.length + (apps.length === 1 ? ' scene' : ' scenes')));
      sum.appendChild(document.createTextNode(' · ' + songCount + (songCount === 1 ? ' song' : ' songs')));
      sum.appendChild(el('span', 'scene-nums', apps.map(a => a.scene.n > 20 ? 'Bows' : a.scene.n).join(', ')));
      box.appendChild(sum);
      box.appendChild(sceneList(apps, { link: true }));
      cell.appendChild(box);
    } else {
      cell.textContent = 'No scenes listed yet';
    }
    tr.appendChild(cell);
    body.appendChild(tr);
    table.appendChild(body);

    return { body, num: String(m.role), words: [student, m.name].map(w => w.toLowerCase()) };
  });

  const boxes = () => [...table.querySelectorAll('details.my-scenes-box')];
  toggle.addEventListener('click', () => {
    const open = !boxes().every(b => b.open);
    boxes().forEach(b => { if (!b.closest('tbody').hidden) b.open = open; });
    toggle.textContent = open ? 'Close every scene list' : 'Open every scene list';
  });

  // Matches the student's name or their role only, not the scenes and songs,
  // which would pull in half the cast. A number, with or without #, is a role number.
  function apply() {
    const q = input.value.trim().toLowerCase();
    const num = q.replace(/^#\s*/, '');
    let shown = 0;
    rows.forEach(r => {
      const hit = !q || (/^\d+$/.test(num) ? r.num === num : r.words.some(w => w.includes(q)));
      r.body.hidden = !hit;
      if (hit) shown++;
    });
    // Hide a group heading when nobody under it matches.
    table.querySelectorAll('tbody.roster-group').forEach(g => {
      let n = g.nextElementSibling, any = false;
      while (n && !n.classList.contains('roster-group')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
      g.hidden = !any;
    });
    count.textContent = shown + (shown === 1 ? ' role' : ' roles');
  }
  input.addEventListener('input', apply);
  apply();
}

/* ---------- scenes page: who is on stage, scene by scene ---------- */

function renderScenes(sceneData, castData) {
  const host = slot('scenes');
  if (!host) return;
  host.innerHTML = '';
  const scenes = (sceneData && sceneData.scenes) || [];
  const members = (castData && castData.members || []).filter(m => m.role);
  const byRole = scenesByRole(sceneData);
  const whoOf = m => ((m.student || '').trim() || 'To be cast');
  const tagOf = m => '#' + m.role + ' ' + m.name;

  const head = el('div', 'scene-head');
  head.appendChild(el('h2', null, 'Scene by scene'));
  head.appendChild(el('p', 'section-intro',
    'Every scene of The Little Mermaid JR., who is on stage in it, and its songs. ' +
    'Pick a name or role number in Student view to see one student’s whole show, including when they are off stage. ' +
    'Costumes will be added here once they are planned.'));
  host.appendChild(head);

  const tabs = el('div', 'filters scene-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'How to look at the scenes');
  const panels = {};
  const buttons = [];
  [['student', 'Student view'], ['grid', 'Grid view'], ['songs', 'Songs']].forEach(([key, label], i) => {
    const b = el('button', 'filter' + (i === 0 ? ' is-on' : ''), label);
    b.type = 'button';
    b.dataset.view = key;
    b.addEventListener('click', () => show(key));
    buttons.push(b);
    tabs.appendChild(b);
  });
  host.appendChild(tabs);
  ['student', 'grid', 'songs'].forEach((k, i) => {
    panels[k] = el('div', 'scene-panel');
    panels[k].hidden = i > 0;
    host.appendChild(panels[k]);
  });
  function show(key) {
    closePlayer();
    buttons.forEach(x => x.classList.toggle('is-on', x.dataset.view === key));
    Object.entries(panels).forEach(([k, p]) => { p.hidden = k !== key; });
    try { localStorage.setItem('legacy-scenes-view', key); } catch (err) { /* private window */ }
  }

  /* ---- student view ---- */
  const picker = el('div', 'search-row');
  const label = el('label', 'sr-only', 'Pick a student');
  label.htmlFor = 'scene-student';
  const select = el('select', 'scene-picker');
  select.id = 'scene-student';
  select.appendChild(new Option('Pick a name or role number…', ''));
  members.forEach(m => select.appendChild(new Option(
    (m.student ? m.student + ' — ' : '') + tagOf(m), String(m.role))));
  picker.appendChild(label);
  picker.appendChild(select);
  panels.student.appendChild(picker);
  const out = el('div', 'student-out');
  panels.student.appendChild(out);

  function drawStudent(key) {
    closePlayer();
    out.innerHTML = '';
    const m = members.find(x => String(x.role) === key);
    if (!m) {
      out.appendChild(el('p', 'filter-note', 'Pick a name or role number to see every scene they are in.'));
      return;
    }
    const apps = byRole.get(+m.role) || [];
    const card = el('section', 'track-card');
    card.appendChild(el('h3', null, (m.student || '').trim() || tagOf(m)));
    const songs = apps.reduce((n, a) => n + (a.scene.songs || []).length, 0);
    card.appendChild(el('p', 'track-sub', ((m.student || '').trim() ? tagOf(m) : 'Not cast yet') + (m.also && m.also.length ? ' · also ' + m.also.join('; ') : '') +
      ' — ' + apps.length + (apps.length === 1 ? ' scene, ' : ' scenes, ') + songs + (songs === 1 ? ' song' : ' songs')));
    if (!apps.length) {
      card.appendChild(el('p', 'filter-note', 'No scenes listed for this role yet.'));
      out.appendChild(card);
      return;
    }
    // Every scene in order: on stage, or folded into an off-stage stretch that
    // says which scene to be ready during.
    const on = new Map(apps.map(a => [a.scene.n, a]));
    const list = el('ol', 'scene-run');
    let offFrom = null;
    const flushOff = upTo => {
      if (offFrom === null) return;
      const from = offFrom, to = upTo;
      offFrom = null;
      const li = el('li');
      const box = el('details', 'run-off');
      const sum = el('summary');
      const span = scenes.filter(s => s.n >= from && s.n <= to);
      sum.appendChild(el('span', 'off-count', 'Off stage · ' + (span.length === 1
        ? 'scene ' + from : span.length + ' scenes, ' + from + '–' + to)));
      const last = span[span.length - 1];
      const cue = el('span', 'off-cue');
      cue.appendChild(document.createTextNode('Be ready during '));
      cue.appendChild(el('strong', null, last.n + '. ' + last.name));
      cue.appendChild(document.createTextNode(' — you are on next'));
      sum.appendChild(cue);
      box.appendChild(sum);
      const inner = el('ol', 'off-list');
      span.forEach(s => {
        const item = el('li', s === last ? 'is-cue' : null);
        item.appendChild(el('span', 'run-num', String(s.n)));
        item.appendChild(el('span', null, s.name + (s === last ? ' · get ready' : '')));
        inner.appendChild(item);
      });
      box.appendChild(inner);
      li.appendChild(box);
      list.appendChild(li);
    };
    scenes.forEach(s => {
      const a = on.get(s.n);
      if (!a) { if (offFrom === null) offFrom = s.n; return; }
      flushOff(s.n - 1);
      const li = el('li');
      li.appendChild(el('span', 'run-num', s.n > 20 ? '★' : String(s.n)));
      const d = el('div', 'run-on');
      const left = el('div');
      left.appendChild(el('strong', null, s.name));
      left.appendChild(el('small', null, 'as ' + a.as.join(', ')));
      d.appendChild(left);
      if ((s.songs || []).length) {
        const ul = el('ul', 'songs');
        s.songs.forEach(x => ul.appendChild(songLine(x, { embed: true })));
        d.appendChild(ul);
      }
      li.appendChild(d);
      list.appendChild(li);
    });
    offFrom = null; // nothing after their last scene needs a cue
    card.appendChild(list);
    out.appendChild(card);
  }

  select.addEventListener('change', () => {
    drawStudent(select.value);
    try { localStorage.setItem('legacy-scenes-role', select.value); } catch (err) { /* private window */ }
  });

  /* ---- grid: roles down the side, scenes across ---- */
  const gridWrap = el('div', 'grid-scroll');
  const table = el('table', 'scene-grid');
  const thead = el('thead');
  const hr = el('tr');
  hr.appendChild(el('th', 'corner', 'Role'));
  scenes.forEach(s => {
    const th = el('th', 'scene-col' + (s.n === 12 ? ' act-start' : ''));
    th.scope = 'col';
    th.appendChild(el('span', null, (s.n > 20 ? '' : s.n + '. ') + s.name));
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tbody = el('tbody');
  let group = null;
  members.forEach(m => {
    if (m.group && m.group !== group) {
      group = m.group;
      const gr = el('tr', 'group-row');
      const gh = el('th', null, group);
      gh.colSpan = scenes.length + 1;
      gh.scope = 'colgroup';
      gr.appendChild(gh);
      tbody.appendChild(gr);
    }
    const tr = el('tr');
    const nameCell = el('th', 'who');
    nameCell.scope = 'row';
    const pick = el('button', 'who-link', tagOf(m));
    pick.type = 'button';
    pick.addEventListener('click', () => pickStudent(String(m.role)));
    nameCell.appendChild(pick);
    nameCell.appendChild(el('small', null, whoOf(m)));
    tr.appendChild(nameCell);
    const mine = new Map((byRole.get(+m.role) || []).map(a => [a.scene.n, a]));
    scenes.forEach(s => {
      const td = el('td', 'cell' + (s.n === 12 ? ' act-start' : ''));
      const a = mine.get(s.n);
      if (a) {
        td.classList.add('on', 'cos-1');
        td.title = tagOf(m) + ' · ' + s.n + '. ' + s.name + ' · as ' + a.as.join(', ');
        td.appendChild(el('span', 'cell-dot', '●'));
        td.appendChild(el('span', 'sr-only', 'on stage as ' + a.as.join(', ')));
      } else {
        td.title = tagOf(m) + ' · ' + s.n + '. ' + s.name + ' · off stage';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  gridWrap.appendChild(table);
  panels.grid.appendChild(gridWrap);
  panels.grid.appendChild(el('p', 'filter-note grid-note',
    'A dot means that role is on stage in that scene; hover over it to see who they play. Act II starts at scene 12. ' +
    'Tap a role for their own scene list.'));

  // On a phone the grid is unreadable, so the same information reads as a list
  // of scenes: open one to see who is on stage in it.
  const cards = el('div', 'scene-cards');
  scenes.forEach(s => {
    const card = el('details', 'scene-card');
    card.id = 'scene-' + s.n;
    const sum = el('summary');
    sum.appendChild(el('span', 'scene-no', s.n > 20 ? '★' : String(s.n)));
    const t = el('span', 'scene-title');
    t.appendChild(el('strong', null, s.name));
    const count = new Set((s.characters || []).flatMap(c => c.roles)).size;
    t.appendChild(el('small', null, count + ' on stage' + ((s.songs || []).length ? ' · ' + s.songs.map(x => x.title).join(', ') : '')));
    sum.appendChild(t);
    card.appendChild(sum);
    const list = el('ul', 'scene-card-list');
    (s.characters || []).forEach(c => {
      const li = el('li');
      li.appendChild(el('strong', null, c.name));
      const who = c.roles.map(n => members.find(m => +m.role === n)).filter(Boolean);
      li.appendChild(el('small', null, who.map(m => m.student ? m.student : '#' + m.role).join(', ') + (c.note ? ' — ' + c.note : '')));
      list.appendChild(li);
    });
    card.appendChild(list);
    cards.appendChild(card);
  });
  panels.grid.appendChild(cards);

  /* ---- songs: every song in running order, with both practice tracks ---- */
  panels.songs.appendChild(el('p', 'filter-note',
    'Every song in the show, scene by scene. “With vocals” is for learning the part; “Accompaniment” is the music alone, to sing along to.'));
  const songList = el('div', 'song-scenes');
  scenes.filter(s => (s.songs || []).length).forEach(s => {
    const box = el('div', 'song-scene');
    box.id = 'songs-' + s.n;
    box.appendChild(el('h4', null, sceneLabel(s)));
    const ul = el('ul', 'songs');
    s.songs.forEach(x => ul.appendChild(songLine(x, { embed: true })));
    box.appendChild(ul);
    songList.appendChild(box);
  });
  panels.songs.appendChild(songList);

  function pickStudent(key) {
    select.value = key;
    drawStudent(key);
    show('student');
    panels.student.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // Open on the role in the address (the Cast page links here with ?role=5), or
  // where they left off. #songs opens the song list, and #scene-7 that scene.
  const asked = new URLSearchParams(location.search).get('role') || '';
  let start = asked;
  if (!start) { try { start = localStorage.getItem('legacy-scenes-role') || ''; } catch (err) { start = ''; } }
  if (members.some(m => String(m.role) === start)) select.value = start;
  drawStudent(select.value);
  let view = '';
  try { view = localStorage.getItem('legacy-scenes-view') || ''; } catch (err) { view = ''; }
  const hash = location.hash.slice(1);
  if (hash === 'songs') view = 'songs';
  if (/^scene-\d+$/.test(hash)) {
    view = 'grid';
    const card = document.getElementById(hash);
    if (card) card.open = true;
  }
  if (!asked && (view === 'grid' || view === 'songs')) show(view);
  if (hash) {
    const target = document.getElementById(hash === 'songs' ? 'scenes' : hash);
    if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 60);
  }
}

/* ---------- parent volunteers ---------- */

function renderVolunteers(data) {
  const host = slot('volunteers');
  if (!host) return;
  host.innerHTML = '';

  host.appendChild(el('h2', null, data.orgName));
  if (data.lead) host.appendChild(el('p', 'lead', data.lead));

  const row = el('div', 'cta-row');
  (data.buttons || []).forEach(b => {
    if (b.url) {
      const a = link(b.url, null, 'cta');
      a.appendChild(el('span', 'cta-icon', b.icon || ''));
      a.appendChild(el('span', 'cta-label', b.label));
      if (b.note) a.appendChild(el('span', 'cta-note', b.note));
      row.appendChild(a);
    } else {
      const d = el('div', 'cta is-disabled');
      d.appendChild(el('span', 'cta-icon', b.icon || ''));
      d.appendChild(el('span', 'cta-label', b.label));
      if (b.note) d.appendChild(el('span', 'cta-note', b.note));
      row.appendChild(d);
    }
  });
  host.appendChild(row);

  if (data.mission) {
    const box = el('div', 'note-box');
    box.appendChild(el('p', null, data.mission));
    host.appendChild(box);
  }

  if (data.committees) {
    const section = el('section');
    section.id = 'committees';
    section.appendChild(el('h2', null, data.committees.heading));
    if (data.committees.intro) section.appendChild(el('p', 'section-intro', data.committees.intro));
    const grid = el('div', 'committee-grid');
    (data.committees.items || []).forEach(c => {
      const card = el('div', 'committee');
      card.appendChild(el('div', 'title', c.name));
      card.appendChild(el('div', 'note', c.what));
      if (c.url) {
        const p = el('div', 'committee-link');
        p.appendChild(link(c.url, (c.linkLabel || 'More') + ' »'));
        card.appendChild(p);
      }
      grid.appendChild(card);
    });
    section.appendChild(grid);
    host.appendChild(section);
  }

  if (data.specialRoles) {
    const section = el('section');
    section.appendChild(el('h2', null, data.specialRoles.heading));
    const p = el('p', 'section-intro');
    p.appendChild(document.createTextNode(data.specialRoles.text + ' '));
    if (data.specialRoles.url) {
      p.appendChild(link(data.specialRoles.url, (data.specialRoles.linkLabel || 'Open the list') + ' »'));
    }
    section.appendChild(p);
    host.appendChild(section);
  }

  if (data.closing) {
    const p = el('p', 'closing-line');
    const parts = data.closing.split(/(\S+@\S+\.\S+?)(?=[\s,.]|$)/);
    parts.forEach(t => {
      if (/\S+@\S+\.\S+/.test(t)) p.appendChild(link('mailto:' + t, t));
      else p.appendChild(document.createTextNode(t));
    });
    host.appendChild(p);
  }
}

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main') || document.body;
  showSkeleton('announcements', 'announcements');
  showSkeleton('calendars', 'calendar');
  showSkeleton('performances', 'shows');
  showSkeleton('cast', 'cast');
  showSkeleton('scenes', 'cast');
  try {
    const site = await loadJSON('data/site.json');
    TRACKS = Array.isArray(site.tracks) ? site.tracks.filter(Boolean) : [];
    sheetTabs = site.sheet || {};
    renderChrome(site);

    // Start every download at once, and draw each section as soon as its own
    // content arrives, rather than one after another.
    const calendarData = (slot('calendars') || slot('announcements') || slot('performances'))
      ? contentFor('calendar', loadJSON('data/calendar.json').then(calendarFromFile), ['Date', 'Title'], calendarFromSheet)
      : Promise.resolve(null);
    const castData = (slot('calendars') || slot('cast') || slot('scenes'))
      ? contentFor('cast', loadJSON('data/cast.json'), ['Role #', 'Student'], castFromSheet)
      : null;
    const sceneData = (slot('cast') || slot('scenes')) ? loadJSON('data/scenes.json') : null;
    const jobs = [];

    if (slot('links')) jobs.push(loadJSON('data/links.json').then(renderLinks));
    if (slot('volunteers')) jobs.push(loadJSON('data/volunteers.json').then(renderVolunteers));
    if (slot('announcements')) {
      const announcements = contentFor('announcements', site.announcements,
        ['Title'], (rows, saved) => Object.assign({}, saved, { items: announcementsFromSheet(rows) }));
      jobs.push(Promise.all([announcements, calendarData]).then(([a, cal]) => {
        site.announcements = a;
        renderAnnouncements(site, cal);
        doneLoading('announcements');
      }));
    }
    if (slot('calendars')) {
      // The cast list feeds the name picker that shows who is called to each rehearsal.
      jobs.push(Promise.all([calendarData, castData.catch(() => null)]).then(([cal, cast]) => {
        renderCalendars(cal, site, cast);
        doneLoading('calendars');
      }));
    }
    if (slot('performances')) {
      jobs.push(calendarData.then(cal => { renderPerformances(cal, site); doneLoading('performances'); }));
    }
    if (slot('cast')) {
      jobs.push(Promise.all([castData, sceneData]).then(([cast, sc]) => { renderCast(cast, sc); doneLoading('cast'); }));
    }
    if (slot('scenes')) {
      jobs.push(Promise.all([sceneData, castData]).then(([sc, cast]) => { renderScenes(sc, cast); doneLoading('scenes'); }));
    }
    await Promise.all(jobs);

    if (usedBackup) {
      // Tell families the page may be a little behind, without alarming them.
      const note = el('p', 'backup-note',
        'We could not load the latest updates just now, so some of this page may be out of date. ' +
        'Try reloading in a few minutes.');
      main.insertBefore(note, main.firstChild);
    }
  } catch (err) {
    showError(main, err);
  } finally {
    // The scenery is pinned to the foot of <main>, so before the content is
    // drawn it would flash near the top of a near-empty page. Reveal it once
    // the layout has settled.
    const showArt = () => document.body.classList.add('art-ready');
    requestAnimationFrame(() => requestAnimationFrame(showArt));
    setTimeout(showArt, 400);
  }
});
