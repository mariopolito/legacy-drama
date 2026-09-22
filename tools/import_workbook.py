"""Read the director's Master Rehearsal & Call Schedule workbook (Role IDs, Scenes,
Songs, and Rehearsal & Call Schedule tabs) and print what it finds as JSON pieces.

    python tools/import_workbook.py "Disney's The Little Mermaid JR. Master Rehearsal & Call Schedule.xlsx"

It writes data/_members.tmp.json, data/_scenes.tmp.json and data/_cal.tmp.json.
These were merged into data/cast.json ("members"), data/scenes.json ("scenes")
and data/calendar.json (the two sections) the first time; after that, compare
before copying anything across so hand edits in the data files are not lost.
Needs openpyxl (pip install openpyxl).
"""
import json, re, sys, datetime
from pathlib import Path
from openpyxl import load_workbook

SRC = sys.argv[1]
OUT = str(Path(__file__).resolve().parents[1] / 'data') + '/'
wb = load_workbook(SRC)

def clean(v):
    if v is None: return ''
    s = str(v).replace('\ufffd', '–').replace('\n', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def cell(v):
    """A Role IDs cell such as '(Scenes 1 & 7)' or 'Scene 16)' without its stray brackets."""
    return clean(v).strip('() ')

def nums(text):
    """'11, 12, 13' or '21–25' -> list of ints."""
    out = []
    for a, b in re.findall(r'(\d+)\s*(?:[–-]\s*(\d+))?', text):
        out.extend(range(int(a), int(b) + 1) if b else [int(a)])
    return out

# ---------- Role IDs ----------
ws = wb['Role IDs']
GROUPS = [(range(1, 11), 'Leads'), (range(11, 17), 'Mersisters & Princesses'),
          (range(17, 21), 'Featured roles'), (range(21, 26), 'Sailor / Chef track'),
          (range(26, 31), 'Creature / Gull track'), (range(31, 36), 'Chorus / Tentacle track')]
members = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None: continue
    n = int(row[0])
    track = cell(row[1])
    featured = cell(row[2])
    role = featured if featured and featured != 'General Ensemble' else re.sub(r'\s*Track$', '', track)
    group = next(g for r, g in GROUPS if n in r)
    also = []
    for name, scenes in ((row[3], row[4]), (row[5], row[6])):
        name, scenes = cell(name), cell(scenes)
        if name in ('–', '-'): name = ''
        if scenes.startswith('Scene 15) '): scenes = 'Scene 15 and the Full Company Finale'
        if name and name != role:
            also.append(name + (' (' + scenes + ')' if scenes else ''))
        elif not name and scenes:
            also.append('On land: ' + scenes)
    members.append({
        'role': n, 'student': '', 'name': role, 'group': group,
        'track': track if track.endswith('Track') else '',
        'also': also
    })

# ---------- Songs (links) ----------
ws = wb['Songs']
SPELL = {'Beluga Sevrugra': 'Beluga Sevruga', 'Confrentation': 'Confrontation', 'Times Up': "Time's Up",
         'Part of Your World Reprise 1': 'Part of Your World (Reprise 1)',
         'Part of Your World Reprise 2': 'Part of Your World (Reprise 2)',
         'Poor Unfortunate Souls Reprise': 'Poor Unfortunate Souls (Reprise)',
         'Part of Your World Finale': 'Part of Your World (Finale)',
         'Under the Sea Bows': 'Under the Sea (Bows)'}
songs = {}
for row in ws.iter_rows(min_row=2):
    if row[0].value is None: continue
    sc = int(row[0].value)
    title = clean(row[2].value)
    link = lambda c: (c.hyperlink.target if c.hyperlink else (c.value or '')).strip()
    songs.setdefault(sc, []).append({'title': SPELL.get(title, title), 'vocals': link(row[3]), 'track': link(row[4])})

# ---------- Scenes ----------
ws = wb['Scenes']
lines = [clean(r[0]) if r[0] is not None else '' for r in ws.iter_rows(values_only=True)]
WORD = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
        'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty']
scenes, cur, mode = [], None, None
ALL = list(range(1, 36))
# Characters the Scenes tab lists without numbers, matched to the role tracks they belong to.
UNNUMBERED = {'Tentacles': list(range(31, 36)), 'Sailors (escorts)': list(range(21, 26)), 'FULL CAST': ALL}
for raw in lines:
    s = raw.strip()
    if not s: continue
    m = re.match(r'Scene (\w+(?:-\w+)?): (.+)$', s)
    if m or s == 'Bows':
        n = WORD.index(m.group(1)) + 1 if m else 21
        cur = {'n': n, 'name': m.group(2) if m else 'Bows', 'songs': [], 'characters': []}
        scenes.append(cur); mode = None; continue
    if s.startswith('Songs:'):
        names = [x.strip() for x in s[6:].split(',') if x.strip() and x.strip() != 'N/A']
        cur['songNames'] = names; continue
    if re.match(r'Ch?r?aracters:', s): continue
    if s in UNNUMBERED:
        cur['characters'].append({'name': 'Full cast' if s == 'FULL CAST' else s, 'roles': UNNUMBERED[s]}); continue
    # "Voice (offstage/Ariel (1))" and "Voice (Ursula (4))"
    vm = re.match(r'Voice \((?:offstage/)?(\w+) \((\d+)\)\)', s)
    if vm:
        cur['characters'].append({'name': vm.group(1) + ' (voice, offstage)', 'roles': [int(vm.group(2))]}); continue
    cm = re.match(r'(.+?)\s*\(([\d,\s–-]+)\)\s*(.*)$', s)
    if cm:
        name, extra = cm.group(1).strip(), cm.group(3).strip()
        cur['characters'].append({'name': name, 'roles': nums(cm.group(2)), **({'note': extra.strip('()')} if extra else {})}); continue
    sm = re.match(r'Sea Creatures ([\d,\s]+),?\s*\((.+)\)', s)
    if sm:
        cur['characters'].append({'name': 'Sea Creatures', 'roles': nums(sm.group(1)), 'note': sm.group(2).replace('including ', 'Including ')}); continue
    raise SystemExit('Unparsed line: ' + s)

EXTRA = [(1, 'Sailors', [17]), (7, 'Sailors', [17]), (2, 'Merpeople', [18]),
         (6, 'Sea Creatures', [20]), (8, 'Gulls', list(range(26, 31)))]
for n, name, roles in EXTRA:
    sc = next(x for x in scenes if x['n'] == n)
    hit = next((c for c in sc['characters'] if c['name'] == name), None)
    if hit: hit['roles'] = sorted(set(hit['roles']) | set(roles))
    else: sc['characters'].append({'name': name, 'roles': roles})

# Attach each scene's songs, with their practice-track links from the Songs tab.
for sc in scenes:
    linked = songs.get(sc['n'], [])
    out = list(linked)
    for name in sc.pop('songNames', []):
        key = re.sub(r'[^a-z]', '', name.lower().replace('reprise', '').replace('finale', '').replace('bows', ''))
        if not any(key[:10] in re.sub(r'[^a-z]', '', s['title'].lower()) for s in linked):
            out.append({'title': name, 'vocals': '', 'track': ''})
    sc['songs'] = out
    sc['act'] = 1 if sc['n'] <= 11 else 2

# ---------- Rehearsal & Call Schedule ----------
ws = wb.worksheets[3]
events = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[0]: continue
    date = row[0].date().isoformat() if isinstance(row[0], datetime.datetime) else str(row[0])
    focus, content, who = clean(row[2]), clean(row[3]), clean(row[4])
    ev = {'date': date, 'title': focus}
    if content: ev['notes'] = [content]
    ev['cast'] = 'None' if re.search(r'no cast', who, re.I) else who
    if not re.search(r'no cast|performance|rest day', who + focus + content, re.I):
        ev['helpers'] = {'volunteer': 'Needed'}
    events.append(ev)

shows = {
    '2027-02-25': {'title': 'School Performance\n(Students only - no parents)', 'performance': True,
                   'blocks': [{'time': '8:30am', 'what': 'Curtain'}]},
    '2027-02-26': {'title': 'Opening Night', 'performance': True,
                   'blocks': [{'time': '4:30pm', 'what': 'Cast call'}, {'time': '6:00pm', 'what': 'Curtain'}]},
    '2027-02-27': {'title': 'Closing Matinee', 'performance': True,
                   'blocks': [{'time': '12:30pm', 'what': 'Cast call'}, {'time': '2:00pm', 'what': 'Curtain'}],
                   'notes': ['Post-show set strike']},
}
rehearsals = [e for e in events if e['date'] not in shows]
performances = []
for e in events:
    if e['date'] in shows:
        performances.append(dict({'date': e['date'], 'cast': e['cast']}, **shows[e['date']]))

json.dump({'members': members}, open(OUT + '_members.tmp.json', 'w'), indent=2)
json.dump({'scenes': scenes}, open(OUT + '_scenes.tmp.json', 'w'), indent=2)
json.dump({'rehearsals': rehearsals, 'performances': performances}, open(OUT + '_cal.tmp.json', 'w'), indent=2)

# Report for review
for m in members: print(m['role'], m['name'], '|', m['group'], '|', m['also'])
for sc in scenes:
    print(sc['n'], sc['name'], [s['title'] + ('' if s['vocals'] else ' (NO LINK)') for s in sc['songs']])
    print('    ', [(c['name'], c['roles']) for c in sc['characters']])
for e in rehearsals[:4]: print(e)
print(len(rehearsals), 'rehearsals', len(performances), 'shows')
