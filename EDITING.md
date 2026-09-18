# How to update the Legacy Drama Club website

No coding needed.

## The Google Sheet: calendar, announcements and cast

The dates, the Home page notices and the cast list can be edited in the
**[Legacy Drama Club Website Content](https://docs.google.com/spreadsheets/d/1zJpFNF36j2_luFDQtrRyPWVqVspotSIDM69DICx7g4A/edit)**
Sheet, one tab each. Row 2 of each tab has a short hint under each heading.

- **Do not rename, move or delete the headings in row 1**, and leave row 2 alone.
- **Blank rows are fine.** The website ignores them.
- **A tab with nothing in it yet** leaves that part of the site showing the matching
  `data/` file instead (see below). Once a tab has rows and is published, the Sheet wins.

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
| School name, season, show title, footer contacts, the motto | `data/site.json` |
| The notices at the top of the Home page | `announcements` in `data/site.json` |
| Rehearsal and show dates | `data/calendar.json` |
| The cast list, or the character descriptions | `data/cast.json` |
| The Links & Folders buttons on the Home page | `data/links.json` |
| The Boosters page | `data/boosters.json` |

## Add a date to the calendar

Copy an existing event in `data/calendar.json`, including its curly brackets, paste it after
another event (with a comma between them) and change it. Order does not matter.

```json
{
  "date": "2026-11-11",
  "title": "Rehearsal: \"Kiss the Girl\"",
  "blocks": [
    { "time": "3:30-5:30pm", "what": "Music and blocking" }
  ],
  "notes": ["Bring your script"],
  "cast": "Eric, Ariel, Sebastian, Lagoon Animals"
}
```

- `date` - `2026-11-11` or `11/11/2026`.
- `endDate` - optional, for something that runs several days, such as tech week.
- `performance` - `true` makes it a show: it gets the coral Performance badge and appears on the
  Shows page.
- `cast` - `All`, `None`, blank for "not posted yet", or names and roles separated by commas.
  Once the cast list is posted, families can pick their student's name at the top of the
  calendar to see which rehearsals they are needed at.
- `titleUrl` and `titleUrlLabel` - optional link under the title.

## Post the cast list

In `data/cast.json`, fill in `members`, one entry per student:

```json
"members": [
  {
    "actor": "Jane Doe",
    "parts": [
      { "role": "Ariel", "description": "Our heroine" },
      { "role": "Mersister Aquata", "description": "" }
    ]
  },
  {
    "actor": "Sam Lee",
    "parts": [ { "role": "Sebastian", "description": "" } ]
  }
]
```

Use `"actor": "TBD"` for a role not cast yet. Change `notPosted` if you want different wording
before the list goes up, and update the announcement on the Home page.

### Double casting

If leads are double cast, put the two track names in `data/site.json`, for example
`"tracks": ["Coral", "Pearl"]`, and give each part a `"track"`: `Coral`, `Pearl`, `Both` or
`TBD`. The cast page then shows coloured track pills and filter buttons. The wording of the
legend and filter notes is in `tracks` and `trackNotes` in `data/cast.json`. Calendar events can
carry a `"track"` too.

## Change a character card

Each card under `characters` in `data/cast.json` has an `icon` (any emoji), a `name`, optional
`tags` (the small gold labels) and a `description`. Cards can be moved between the three groups
or new groups added.
