# Still to be confirmed

Everything the site is waiting on from Legacy. Tick an item off by deleting its line.

## Links and names

- [ ] Club name as it should appear in the header (`school` in `data/site.json`) - currently "Legacy Drama Club".
- [ ] Club logo - `assets/img/legacy-drama-logo.svg` is a placeholder badge.
- [ ] Sponsor name and email, and the club's contact email (`contacts` in `data/site.json`, `closing` in `data/volunteers.json`).
- [ ] Links & Folders - Script & Materials, rehearsal volunteer sign-up, and musical fees & donations (`data/links.json`).
- [ ] Rehearsal-helper sign-up link (`helpSignupUrl` in `data/site.json`); the calendar's Sign up buttons go nowhere until then.
- [ ] Parent Volunteers - the volunteer sign-up form and the musical-fund donation link (`data/volunteers.json`).
- [ ] Rehearsal start and end times - the schedule has dates and content but no times.
- [ ] Call time for the school performance on February 25.
- [ ] Practice tracks for "Where's Ariel" (scene 2) and "Human Again" (scene 20), which are in the Scenes list but not the Songs list.
- [ ] Remove the "This website is a draft" announcement in `data/site.json` once the above is done.

## Questions for the director about the schedule

The Role IDs tab and the Scenes tab disagree in a few places. The site counts a student as in a
scene if *either* tab puts them there, so nobody is told they are off stage by mistake:

- [ ] #17 (Chef Louis) as a Sailor in scenes 1 and 7 - on Role IDs, not in the Scenes list.
- [ ] #18 (Carlotta) with the Merpeople in scene 2 - on Role IDs, not in the Scenes list.
- [ ] #20 (Seahorse) as a Sea Creature in scene 6 - on Role IDs; the Scenes list gives the Sea Creatures as #11-16.
- [ ] Gulls (#26-30) in scene 8 - on Role IDs, not in the Scenes list.
- [ ] Tentacles (scene 18) and Sailors as escorts (scene 16) have no role numbers; the site uses the Chorus/Tentacle track (#31-35) and the Sailor/Chef track (#21-25).

Some blocking rehearsals do not call everyone in the scenes they cover. The calendar shows the
schedule exactly as written, so these students would be told they are not needed:

- [ ] Blocking #1 (scenes 1-3) - Sea Chorus #31-35 (the note in brackets says Sea Chorus, but the numbers stop at 30).
- [ ] Blocking #3 (scenes 6-8) - #11-16 (Sea Creatures in scene 6).
- [ ] Blocking #5 (scenes 12-13) - #5 Sebastian and #6 Flounder.
- [ ] Blocking #6 (scenes 14-15) - #9 Flotsam, #10 Jetsam and #17 Chef Louis.
- [ ] Blocking #7 (scene 16) - #4 Ursula, #5 Sebastian and the Sailor escorts #21-25.

## Setup

- [ ] Where the site will be hosted for good. For now it is the private repository <https://github.com/mariopolito/legacy-drama>; GitHub Pages is not switched on yet.
- [ ] Google Sheet - run `setUp` in the Sheet's Apps Script so it gets its Publish tab and Website menu, then add the Publish tab's link to `sheet` in `data/site.json`.
- [ ] Google Sheet - change the Cast tab's headings to **Role #** and **Student** (row 1), with hints in row 2.
