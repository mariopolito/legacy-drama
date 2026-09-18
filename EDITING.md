# How to update the Legacy Drama Club website

No coding needed. Every change is an edit to one of the files in the `data/` folder. On GitHub,
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
