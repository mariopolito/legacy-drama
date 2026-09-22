# How to update the Legacy Drama Club website

No coding needed.

## The Google Sheet: calendar, announcements and cast names

The dates, the Home page notices and the students' names can be edited in the
**[Legacy Drama Club Website Content](https://docs.google.com/spreadsheets/d/1zJpFNF36j2_luFDQtrRyPWVqVspotSIDM69DICx7g4A/edit)**
Sheet, one tab each. Row 2 of each tab has a short hint under each heading.

- **Do not rename, move or delete the headings in row 1**, and leave row 2 alone.
- **Blank rows are fine.** The website ignores them.
- **A tab with nothing in it yet** leaves that part of the site showing the matching
  `data/` file instead (see below). Once a tab has rows and is published, the Sheet wins, so a
  tab needs *every* date or notice, not just new ones.

| Tab | What it holds |
| --- | --- |
| Calendar | One row per date. **Cast needed** takes role numbers, the way the call schedule is written: `Role #s 1, 4, 11–16 (Ariel, Ursula, Mersisters)`, `ALL CAST`, or `NO CAST CALLED`. The words in brackets are for people to read; the numbers before them are what the site uses. **Study hall volunteer** is the rehearsal helper: a parent's name, or `Needed` for a Sign up button |
| Announcements | One row per box at the top of the Home page |
| Cast | Two columns: **Role #** and **Student**. One row per role number (1–35) with the student cast in it |

Nothing goes live until you publish. When your changes are ready, choose
**Website → Publish changes to the website** in the Sheet and click **OK**. While the
repository is private the site checks for a publish once an hour; to publish straight away,
open the repository's **Actions** tab, pick **Publish the Google Sheet to the website** and
click **Run workflow**. **Website → Check publishing status** works once the site is live on
GitHub Pages.

## The data files: everything else

Every other change is an edit to one of the files in the `data/` folder. On GitHub,
open the file, click the pencil icon, edit, and choose **Commit changes**. The site updates in a
minute or two.

Change only the text between the quotation marks. If the site shows "has a typo in it", look for
a missing comma, bracket or quotation mark near the line it names. The **Check the data files**
check on GitHub catches these too.

| I want to change... | File |
| --- | --- |
| School name, season, footer contacts, the motto, the rehearsal-helper sign-up link | `data/site.json` |
| The notices at the top of the Home page | `announcements` in `data/site.json` |
| Rehearsal and show dates | `data/calendar.json` |
| Role numbers, their roles, students' names, character descriptions | `data/cast.json` |
| Scenes, who is in each one, songs and practice-track links | `data/scenes.json` |
| The Links & Folders buttons on the Home page | `data/links.json` |
| The Parent Volunteers page | `data/volunteers.json` |

## Calendar dates

Each date in `data/calendar.json` looks like this. Order does not matter.

```json
{
  "date": "2026-10-29",
  "title": "Music #2",
  "notes": ["Fathoms Below, Daughters of Triton, Human Stuff, She’s in Love"],
  "cast": "Role #s 1–30 (All Leads, Mersisters, Louis, Carlotta, Pilot, Seahorse, Sailors, Creatures/Gulls)",
  "helpers": { "volunteer": "Needed" }
}
```

- `blocks` - optional times, such as `[{ "time": "3:30-5:30pm", "what": "Rehearsal" }]`.
- `performance` - `true` makes it a show on the Shows page.
- `helpers` - `Needed` shows a Sign up button (to `helpSignupUrl` in `data/site.json`) until a
  parent's name replaces it. Leave it out for no helper line.

Families pick a name or role number at the top of the calendar to see which rehearsals that
student is called to.

## The cast list

`members` in `data/cast.json` has one entry per role number, from the director's Role IDs list:

```json
{ "role": 5, "student": "", "name": "Sebastian", "group": "Leads", "also": [] }
```

Type the student's name into `student` once the cast list is final (or fill in the Sheet's Cast
tab instead). `also` lists their ensemble tracks, such as `"Sailors (Scenes 1 & 7)"`.

## Scenes and songs

`data/scenes.json` lists every scene in running order. Each has its `characters`, with the role
numbers who play them, and its `songs`, each with a `vocals` link (the practice track with
singing) and a `track` link (accompaniment only). The Cast page and the Scenes page both work
out who is in which scene from this file, so a change here shows up on both.

To add a practice track that is missing, fill in `vocals` and `track` for that song. A song with
neither shows "Practice track coming".

If the director updates her Master Rehearsal & Call Schedule workbook, `tools/import_workbook.py`
reads it again; see the note at the top of that file.
