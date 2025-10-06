// Data model
// {
//   menu: { breakfast: string, lunch: string, snacks: string, dinner: string },
//   buses: { routes: [{ route: string, times: string[] }] }
// }

const titleAliases = {
  breakfast: ['breakfast', 'bf'],
  lunch: ['lunch'],
  snacks: ['snacks', 'tiffin', 'snack'],
  dinner: ['dinner', 'supper'],
};

const findKey = (line) => {
  const lower = line.toLowerCase();
  for (const [key, aliases] of Object.entries(titleAliases)) {
    if (aliases.some((a) => lower.startsWith(a + ':'))) return key;
  }
  return null;
};

function parseMenu(lines) {
  const menu = { breakfast: '', lunch: '', snacks: '', dinner: '' };
  lines.forEach((line) => {
    const key = findKey(line);
    if (key) {
      const val = line.split(':').slice(1).join(':').trim();
      menu[key] = val;
    }
  });
  return menu;
}

function parseBuses(lines) {
  const routes = [];
  const arrowRegex = /\s*(→|->|to)\s*/i;
  const timeRegex = /((1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM))/ig;

  lines.forEach((line) => {
    if (!line.trim()) return;
    // Format: Route A → Route B: 9:00 PM, 10:00 PM
    const parts = line.split(':');
    if (parts.length < 2) return;
    const routeRaw = parts[0].trim();
    const timesRaw = parts.slice(1).join(':');
    const [from, to] = routeRaw.split(arrowRegex).filter(Boolean);
    if (!from || !to) return;
    const route = `${from.trim()} → ${to.trim()}`;
    const times = [];
    const matches = timesRaw.match(timeRegex);
    if (matches) {
      matches.forEach((t) => times.push(t.toUpperCase().replace(/\s+/g, ' ').trim()));
    }
    if (times.length) routes.push({ route, times });
  });

  return { routes };
}

import { parseMultiCategoryBusText } from './busParser';

export function parseAllFromText(text, fallback) {
  if (!text || !text.trim()) return fallback || null;

  // Detect advanced multi-category bus schedule (contains Bus Times + Working Days)
  if (/bus times/i.test(text) && /working days/i.test(text)) {
    const advanced = parseMultiCategoryBusText(text);
    return {
      menu: (fallback?.menu) || { breakfast: '', lunch: '', snacks: '', dinner: '' },
      buses: {
        multi: advanced.categories,
        specials: advanced.specials,
      }
    };
  }

  // If user pasted JSON in our shape, just trust it.
  try {
    const obj = JSON.parse(text);
    if (obj && obj.menu && obj.buses) return obj;
  } catch {}

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Split sections heuristically: until we meet a line starting with buses or looks like a route
  const busStartIdx = lines.findIndex((l) => /^(buses|bus)[:\s]/i.test(l) || /(→|->|to)/i.test(l));

  const menuLines = busStartIdx === -1 ? lines : lines.slice(0, busStartIdx);
  const busLines = busStartIdx === -1 ? [] : lines.slice(busStartIdx).filter((l) => !/^buses[:\s]?$/i.test(l));

  const menu = parseMenu(menuLines);
  const buses = parseBuses(busLines);

  // Merge with fallback so missing keys are preserved
  const out = {
    menu: { ...(fallback?.menu || {}), ...menu },
    buses: { routes: buses.routes.length ? buses.routes : (fallback?.buses?.routes || []) },
  };
  return out;
}
