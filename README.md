# Legacy Drama Club website

A static site for GitHub Pages, built on the same pattern as the Mesa Academy Drama Club site.
There is no build step, no framework and there are no dependencies. The pages are plain HTML,
and they draw their content from the JSON files in `data/` when they load.

**This is a skeleton.** Names, dates, links and the club logo are placeholders. See
[STILL-TO-BE-CONFIRMED.md](STILL-TO-BE-CONFIRMED.md) for what the club needs to supply, and
[EDITING.md](EDITING.md) for how to change things.

## Files

```
index.html          Home: announcements, coming up, links & folders
calendar.html       Rehearsal & call schedule, with a picker for which rehearsals a student is called to
performances.html   Shows: built from the calendar's performance dates
cast.html           All 35 roles, who plays them, and their scenes with practice-track links
scenes.html         Scene by scene: Student view, Grid view and every song
volunteers.html     Parent Volunteers: ways to help, sign-up and the musical fund
data/site.json      Header, announcements, footer contacts, rehearsal-helper sign-up
data/calendar.json  Calendar sections and dates
data/cast.json      Role numbers, their roles and students, and Meet the Characters
data/scenes.json    Every scene: characters by role number, songs and practice tracks
data/links.json     Links & folders section on the Home page
data/volunteers.json Parent Volunteers page
data/sheet-cache/   Published copy of the Sheet's tabs, written by the snapshot workflow
assets/css/site.css Styling (light and dark)
assets/js/site.js   Reads the JSON files and draws the pages
assets/img/         Show logo, placeholder club logo, page scenery (SVG)
apps-script/        Copy of the Sheet's Publish button script
tools/              import_workbook.py reads the director's Master Rehearsal & Call Schedule
.github/workflows/  validate.yml checks the JSON; sheet-snapshot.yml publishes the Sheet
.nojekyll           Tells GitHub Pages to serve the files as-is
```

## Differences from the Mesa site

- **The Sheet is optional, tab by tab.** Like the Mesa site, the calendar, announcements and
  cast can come from a Google Sheet with a Publish button: the **Publish the Google Sheet to
  the website** workflow copies the published tabs into `data/sheet-cache/`, and the pages read
  that copy. A tab with no rows yet leaves the matching JSON file in charge. The Sheet's tab
  links sit in `"sheet"` in `data/site.json`; the Publish button's source is in
  `apps-script/website-publish-button.gs` (editing that copy does not change the Sheet).
- **The publish check runs hourly** while the repository is private, to stay inside GitHub's
  free Actions minutes. Once it is public, switch the cron in `sheet-snapshot.yml` to every five
  minutes and set `PUBLISH_DELAY` in the Sheet's script to match.
- **The calendar is a flat list.** Each date is written once; the site works out the weekday
  and files it under its month.
- **Everyone is a role number.** The director numbers the 35 roles (Role IDs), and the call
  schedule, the cast list and the scenes all use those numbers, so the site works before casting
  and just gains names after it. The Sheet's Cast tab only holds Role # and Student.
- **Scenes come from one file.** `data/scenes.json` lists the characters in each scene by role
  number, and the Cast and Scenes pages both work out each student's scenes from it. The Scenes
  page follows the Mesa one (Student view and Grid view) without costumes for now, plus a Songs
  view with every practice track.
- **Parent Volunteers** replaces the Mesa site's Boosters page.
- The calendar, cast and scenes came from the director's *Master Rehearsal & Call Schedule*
  workbook via `tools/import_workbook.py`. Where its Role IDs and Scenes tabs disagree, the site
  counts both; see STILL-TO-BE-CONFIRMED.md.

## Hosting

Create a GitHub repository, push the contents of this folder to its `main` branch, and turn on
**Settings → Pages** (deploy from `main`, root folder). Naming the repository
`<account>.github.io` puts the site at the root address. Every push redeploys it within a
minute or two.

## Running it locally

The pages fetch their content, so opening `index.html` straight from disk will not work.
Serve the folder instead:

```bash
python -m http.server 8766
```

Then visit <http://localhost:8766>.

## Notes

- `site.css` and `site.js` are loaded with a `?v=` stamp. Raise it in all five HTML files after
  a style or script change so browsers do not serve a stale copy.
- Dates drive the display: past events are dimmed, the next one gets a gold outline, finished
  months fold shut, and the "Coming up" cards on the home page come from the calendar.
- The Little Mermaid JR. logo is Disney/MTI artwork, used for the school's licensed production.
