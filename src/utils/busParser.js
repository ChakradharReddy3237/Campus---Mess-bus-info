// Advanced bus schedule parser for multi-category timetable text.
// Expected categories: Working Days, Saturdays and M–F Holidays, Sundays.
// Also captures Palakkad Town and Wise Park special routes (list of narrative entries).

const CATEGORY_LABELS = [
  { key: 'working', patterns: [/^working days/i] },
  { key: 'saturday', patterns: [/^saturdays?\b/i, /saturdays? and m.?–?f holidays/i] },
  { key: 'sunday', patterns: [/^sundays?\b/i] }
];

const ROUTE_LINE_REGEX = /^(nila\s*(to|→)\s*sahyadri|sahyadri\s*(to|→)\s*nila)\s*:/i;
const TIME_TOKEN = /(?:(?:[01]?\d|2[0-3]):[0-5]\d|(?:[1-9]|1[0-2]))(?:[:.]?[0-5]\d)?/g; // matches 8:30, 8.45, 12, 12:15

// Normalizes time tokens into HH:MM 24h or keeps as given with AM/PM inference not provided (source lacks AM/PM mostly).
function normalizeTime(raw) {
  let t = raw.trim();
  t = t.replace(/\./g, ':');
  if (/^\d{1,2}$/.test(t)) {
    // lone hour, treat as H:00
    t = t + ':00';
  } else if (/^\d{1,2}:\d{1}$/.test(t)) {
    const [h, m] = t.split(':');
    t = h + ':' + m.padStart(2, '0');
  }
  // Ensure leading zero for hour < 10
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = m[1].padStart(1, '0');
    return `${h}:${m[2]}`;
  }
  return t;
}

export function parseMultiCategoryBusText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const categories = {};
  let currentCat = null;
  let inBusBlock = false;
  let specialsCollector = [];
  let specialsContext = null; // 'palakkadTown' | 'wisePark'

  // Data structure:
  // categories: { working: { routes: { "Nila → Sahyadri": [times], "Sahyadri → Nila": [times] } }, ... }
  // specials: { palakkadTown: [string], wisePark: [string] }

  const specials = { palakkadTown: [], wisePark: [] };

  function ensureCat(key) {
    if (!categories[key]) {
      categories[key] = { routes: { 'Nila → Sahyadri': [], 'Sahyadri → Nila': [] } };
    }
  }

  function commitSpecialLine(line) {
    if (specialsContext === 'palakkadTown') specials.palakkadTown.push(line);
    if (specialsContext === 'wisePark') specials.wisePark.push(line);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect category switches
    const catMatch = CATEGORY_LABELS.find(c => c.patterns.some(p => p.test(line)));
    if (catMatch) {
      currentCat = catMatch.key;
      ensureCat(currentCat);
      inBusBlock = false;
      specialsContext = null;
      continue;
    }

    // Detect route lines for bus times
    if (ROUTE_LINE_REGEX.test(line)) {
      if (!currentCat) {
        // default to working if not set when first route appears
        currentCat = 'working';
        ensureCat(currentCat);
      }
      inBusBlock = true;
      specialsContext = null;

      const [routeLabel, timesPartRaw] = line.split(/:/, 2);
      const routeNorm = routeLabel.toLowerCase().includes('nila') && routeLabel.toLowerCase().includes('sahyadri')
        ? routeLabel
            .replace(/to/i, '→')
            .replace(/\s+/g, ' ')
            .replace(/nila\s*→?\s*sahyadri/i, 'Nila → Sahyadri')
            .replace(/sahyadri\s*→?\s*nila/i, 'Sahyadri → Nila')
        : routeLabel;
      const route = routeNorm.includes('Sahyadri → Nila') ? 'Sahyadri → Nila' : 'Nila → Sahyadri';
      const timesInline = timesPartRaw ? timesPartRaw : '';
      const subsequent = [];
      // Collect following lines that are continuation (no colon, contain time tokens) until blank or new section
      for (let j = i + 1; j < lines.length; j++) {
        const nxt = lines[j];
        if (!nxt) break;
        if (ROUTE_LINE_REGEX.test(nxt)) break;
        if (/^(palakkad town)/i.test(nxt) || /wise park junction/i.test(nxt) || CATEGORY_LABELS.some(c => c.patterns.some(p => p.test(nxt)))) break;
        if (/^\*/.test(nxt)) continue; // skip notes line
        if (nxt.includes(':') && !TIME_TOKEN.test(nxt)) break; // looks like narrative with a colon but not times
        subsequent.push(nxt);
        i = j; // advance outer loop
      }
      const merged = [timesInline, ...subsequent].join(' ');
      const rawTimes = merged.match(TIME_TOKEN) || [];
      const normTimes = rawTimes.map(normalizeTime);
      ensureCat(currentCat);
      categories[currentCat].routes[route] = normTimes;
      continue;
    }

    // Specials contexts
    if (/^palakkad town/i.test(line)) {
      specialsContext = 'palakkadTown';
      continue;
    }
    if (/wise park junction/i.test(line)) {
      specialsContext = 'wisePark';
      continue;
    }

    // Collect bullet / numbered lines under specials
    if (specialsContext) {
      commitSpecialLine(line.replace(/^\d+\.\s*/, ''));
      continue;
    }
  }

  return { categories, specials };
}
