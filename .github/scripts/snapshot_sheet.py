"""Publish the Google Sheet to the website.

The website reads data/sheet-cache/, not the Sheet, so nothing an editor types
appears until they click Publish in the Sheet. Publish stamps the date and time
into the Sheet's Publish tab; this script runs every few minutes, and when that
stamp has changed since the last run it copies the tabs into data/sheet-cache/.

A tab is only written if what came back looks like the real tab (CSV, with the
columns the website needs). Anything else, such as an error page or a renamed
column, leaves the last published copy alone.
"""
import csv
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "sheet-cache"
REQUIRED = {
    "calendar": ["Date", "Title"],
    "announcements": ["Title"],
    "cast": ["Actor", "Role"],
}
STAMP_LABEL = "publish stamp"


def fetch(url):
    sep = "&" if "?" in url else "?"
    with urllib.request.urlopen(f"{url}{sep}t={int(datetime.now().timestamp())}", timeout=60) as r:
        return r.read().decode("utf-8-sig")


def looks_right(text, required):
    if text.lstrip().startswith("<"):
        return "got a web page, not CSV"
    first = text.splitlines()[0] if text else ""
    heads = [h.strip().strip('"') for h in first.split(",")]
    missing = [h for h in required if h not in heads]
    return f"missing columns {missing}" if missing else None


def read_stamp(url):
    """The value beside "Publish stamp" on the Sheet's Publish tab."""
    text = fetch(url)
    if text.lstrip().startswith("<"):
        raise ValueError("the Publish tab is not published as CSV")
    for row in csv.reader(io.StringIO(text)):
        if row and row[0].strip().lower() == STAMP_LABEL:
            return (row[1].strip() if len(row) > 1 else "")
    raise ValueError('the Publish tab has no "Publish stamp" row')


def main():
    site = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
    links = site.get("sheet") or {}
    CACHE.mkdir(parents=True, exist_ok=True)
    meta_path = CACHE / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    forced = os.environ.get("FORCE_PUBLISH", "").lower() == "true"

    stamp = None
    if links.get("publish"):
        try:
            stamp = read_stamp(links["publish"])
        except Exception as err:
            print(f"Could not read the Publish tab ({err})")
            if not forced:
                print("Nothing published; the site keeps the last published copy.")
                return 0
        if stamp is not None and stamp == meta.get("publishStamp") and not forced:
            print(f"No publish requested since {stamp or 'the beginning'}; nothing to do.")
            return 0
    elif not forced:
        print("No Publish tab link in data/site.json; nothing to do.")
        return 0

    changed = False
    for name, required in REQUIRED.items():
        url = links.get(name)
        if not url:
            print(f"{name}: no Sheet link set, skipped")
            continue
        try:
            text = fetch(url).replace("\r\n", "\n")
        except Exception as err:
            print(f"{name}: could not fetch ({err}); keeping the last published copy")
            continue
        problem = looks_right(text, required)
        if problem:
            print(f"{name}: {problem}; keeping the last published copy")
            continue
        path = CACHE / f"{name}.csv"
        if path.exists() and path.read_text(encoding="utf-8") == text:
            print(f"{name}: unchanged")
            continue
        path.write_text(text, encoding="utf-8", newline="")
        meta[name] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        changed = True
        print(f"{name}: published")

    # Record the publish even when nothing changed, so the same request is not
    # acted on again every five minutes.
    if stamp is not None:
        meta["publishStamp"] = stamp
    meta["publishedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print("published something new" if changed else "published; no content had changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
