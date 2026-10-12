# Path of the Idle Cultivator Save Editor

A free, browser-based save editor for [*Path of the Idle Cultivator*](https://store.steampowered.com/app/5007580/Path_of_the_idle_cultivator/). Load your save, change what you want, and download a file the game will accept.

**[Open the editor](https://statictrace.github.io/Path-of-the-idle-cultivator---Save-Editor/)**

Everything runs locally in your browser. Your save file is never uploaded anywhere, and there is no server, account or tracking.

> **Back up your save before you do anything else.** Copy the original file somewhere safe before replacing it with an edited one. Wrong values can permanently break a character. The editor has a "Download backup of loaded file" button, but keep your own copy too.

## What you can edit

| Tab | What it does |
| --- | --- |
| **Essentials** | Qi, celestial Qi, spirit stones, deity energy, renown, ages, realm and stage, rebirths, soul power, ascensions, HP, damage, defense, crit and monster tier. |
| **Unlocks** | Toggle every game mechanic on or off, with a filter box and Unlock all / Lock all. |
| **Inventory** | Search items, change quantities, remove items, or add an item by its ID. |
| **Data tree** | Browse the whole save as an expandable tree. Search by key path (for example `spiritStones` or `realm.stage`) and edit any value. |
| **Raw JSON** | Edit the full save as text. Invalid JSON is rejected before it is applied. |

## How to use it

1. Find your save file and **make a backup copy**.
2. Open the editor and drag your save onto the page (or click *browse*).
3. Edit values in any tab. Fields that fail validation turn red and are not applied.
4. Click **Export save**. A file with the same name as the one you loaded is downloaded.
5. Close the game, replace your save file with the downloaded one, and start the game.

If the game rejects the file, restore your backup.

## Safety checks

- The game stores large numbers as text strings. The editor keeps each value's original type, so numbers stay numbers and strings stay strings.
- Before download, the exported file is decoded again and compared with your data. If they differ, the export is blocked.
- Unlocking mechanics you have not reached in game can cause odd behaviour. Change one thing at a time if you are unsure.

## Save format

The game's save is `JSON → UTF-8 → XOR with a repeating key → Base64`. The editor detects the format automatically and exports in the same one it loaded. It also accepts plain JSON and plain Base64.

## Run it locally

No build step and no dependencies. ES modules need HTTP, so don't open `index.html` directly from disk:

```bash
git clone https://github.com/StaticTrace/Path-of-the-idle-cultivator---Save-Editor.git
cd Path-of-the-idle-cultivator---Save-Editor
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Project structure

```
index.html      page shell
css/style.css   styling
js/codec.js     format detection, XOR and Base64 encode/decode
js/app.js       interface: tabs, editors, tree inspector, export
.nojekyll       tells GitHub Pages to serve files as-is
```

## Deploy your own copy

1. Fork or copy this repo.
2. In **Settings → Pages**, set the source to *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. After about a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Contributing

Bug reports and pull requests are welcome. If the game updates and your save stops loading, please open an issue and describe what changed. Do not attach your save file unless you are comfortable sharing it.

## Disclaimer

This is an unofficial fan tool and is not affiliated with the game's developer or publisher. Use it at your own risk. Editing saves may affect your progress and may not suit online or competitive features.

## License

[MIT](LICENSE)
