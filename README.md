# Campus Mess & Bus Dashboard (Static Edition)

Static React site that loads `public/data/menuCycle.json` and `public/data/busSchedule.json` then persists any browser‑side edits (future UI) to `localStorage`. No server – every visitor has their own personal data copy.

## Why Static?
You selected the simple path: public read + personal per‑browser edits. This avoids hosting costs and backend complexity. Data resets per user if they clear site storage or open in a new device.

## Quick Start (Local)
1. Install deps: `npm install`
2. Run dev server: `npm start`
3. Build production: `npm run build`
4. Preview build: `npm run preview`

## File Structure (Core)
```
public/
	index.html
	data/
		menuCycle.json        # initial menu cycle (static seed)
		busSchedule.json      # initial bus schedule (static seed)
src/
	index.js                # React root
	App.js                  # Loads + displays raw JSON (placeholder UI)
	App.css                 # Base styling
```

## Editing Data (Current Minimal State)
Right now the UI just shows raw JSON. In the prior interactive build you had chip editors; you can port them back into this simplified scaffold if desired. Local changes are saved automatically to `localStorage` key `campusData_v1`.

To reset data: Open DevTools > Application > Local Storage > remove the key or run:
`localStorage.removeItem('campusData_v1')`

## Deploy on Render (Static Site)
1. Push repo to GitHub.
2. In Render: New + Static Site.
3. Select repo & branch (e.g. main).
4. Build Command: `npm install && npm run build`
5. Publish Directory: `build`
6. (Optional) Set Node version in Render settings (e.g. 18).
7. Save – Render builds and serves the static bundle.

Future changes: push to branch → automatic redeploy.

## Deploy on GitHub Pages (Alternative)
1. `npm install gh-pages --save-dev`
2. Add to package.json:
	 ```json
	 "homepage": "https://<user>.github.io/<repo>",
	 "scripts": {
		 "predeploy": "npm run build",
		 "deploy": "gh-pages -d build"
	 }
	 ```
3. Run: `npm run deploy`

## Adding Back Advanced Editors
Port your earlier components (`AdvancedMenuEditor`, `BusEditorModal`, etc.) into `App.js` layout. Replace the raw `<pre>` sections with those components and maintain the same persistence calls. Keep fetch seed pattern for first visit.

## Roadmap (Optional)
- Events panel (client only) seeded via another JSON.
- Export/Import button allowing user to backup their personal data.
- Theming toggle (dark/light) using CSS variables.

## Current Features
- Mess menu viewer with week/day navigation and meals grid.
- Bus schedule viewer with category tabs, direction toggle, hide past times option, and next bus countdown.
- Unified Update Data modal containing:
	- Advanced Menu Editor (week tabs, meal/day selection, common items propagate to all days).
	- Bus Editor (category creation, time chips, specials list).
	- Import JSON panel (paste structure to overwrite data locally).
- Local persistence via `localStorage` (per-browser, no server).
- Responsive adaptive card/grid layout.

## JSON Structures
Menu sample:
```json
{ "startDate": "2025-10-06", "weeks": [ { "week": 1, "days": [ { "day": "Mon", "meals": { "breakfast": ["Idli"] } } ] } ] }
```
Bus sample:
```json
{ "categories": { "Weekday": { "toCampus": ["07:30"], "fromCampus": ["08:45"] } }, "specials": [{ "label": "Late Night", "time": "23:00" }] }
```

## License
Private / internal. Add a license if you plan to open source.
