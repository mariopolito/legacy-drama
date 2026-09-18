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
calendar.html       Calendar, with the "Show rehearsals for" name picker once a cast is posted
performances.html   Shows: built from the calendar's performance dates
cast.html           Cast list (after casting) and Meet the Characters
boosters.html       Join the Boosters: membership, donation, committees
data/site.json      Header, announcements, footer contacts, double-cast tracks
data/calendar.json  Calendar sections and dates
data/cast.json      Cast page intro, characters and the cast list
data/links.json     Links & folders section on the Home page
data/sheet-cache/   Published copy of the Sheet's tabs, written by the snapshot workflow
data/boosters.json  Boosters page
assets/css/site.css Styling (light and dark)
assets/js/site.js   Reads the JSON files and draws the pages
assets/img/         Show logo, placeholder club logo, page scenery (SVG)
apps-script/        Copy of the Sheet's Publish button script
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
- **Double casting is optional.** Put two track names in `"tracks"` in `data/site.json` to get
  the coloured track pills and filters. With an empty list the cast table has no Track column.
- **Meet the Characters.** The cast page shows a card for every role in `data/cast.json`, so
  families can read up before auditions. The cast table appears above it once `members` is
  filled in.

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
