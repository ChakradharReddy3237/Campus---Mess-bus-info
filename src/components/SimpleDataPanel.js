import React, { useState } from 'react';
import { parseMultiCategoryBusText } from '../utils/busParser';

const SimpleDataPanel = ({ onClose, onSave, currentData }) => {
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!rawText.trim()) {
      setError('Please paste some data first');
      return;
    }

    try {
      const { menu, menuCycle, busWeek, busesFallback } = parseAll(rawText, currentData);

      const newData = {
        ...currentData,
        menu: menu,
        menuCycle: menuCycle || currentData.menuCycle,
        buses: {
          ...currentData.buses,
          ...(busWeek ? { week: busWeek } : {}),
          ...(busesFallback?.routes ? { routes: busesFallback.routes } : {}),
          ...(busesFallback?.specials ? { specials: busesFallback.specials } : {})
        }
      };

      onSave(newData);
    } catch (err) {
      setError(err.message || 'Could not parse the data. Please check the format.');
    }
  };

  // --- Parsing Helpers ---
  const extractMealDataSimple = (lines, mealType) => {
    const line = lines.find(l => l.toLowerCase().startsWith(mealType + ':'));
    return line ? line.split(':').slice(1).join(':').trim() : '';
  };

  function parseAll(text, current) {
    const linesRaw = text.split(/\r?\n/);
    const lines = linesRaw.map(l => l.trim());
    const nonEmpty = lines.filter(Boolean);

  const hasMenuCycle = /START MENU CYCLE:/i.test(text);
    const hasBusWeek = /START BUS WEEK:/i.test(text);
    const hasMultiCategory = /working days/i.test(text) && /saturdays/i.test(text) && /sundays/i.test(text);
  const has4WeekMenu = /START 4-WEEK MENU:/i.test(text);    let menu = { ...current.menu };
    let menuCycle = null;
    let busWeek = null;
    let busesFallback = null;

    // 1. Menu Cycle
    if (has4WeekMenu) {
      menuCycle = parse4WeekMenu(lines);
      // Set today's menu as preview
      if (menuCycle?.weeks) {
        const todayMenu = getCurrentMenuFrom4Week(menuCycle);
        if (todayMenu) menu = todayMenu;
      }
    } else if (hasMenuCycle) {
      menuCycle = parseMenuCycle(lines);
      if (menuCycle.days && menuCycle.days.length === 14) {
        menu = { ...menuCycle.days[0] };
      }
    } else {
      // simple single-day menu extraction fallback
      menu = {
        breakfast: extractMealDataSimple(nonEmpty.map(l=>l.toLowerCase()), 'breakfast') || menu.breakfast,
        lunch: extractMealDataSimple(nonEmpty.map(l=>l.toLowerCase()), 'lunch') || menu.lunch,
        snacks: extractMealDataSimple(nonEmpty.map(l=>l.toLowerCase()), 'snacks') || menu.snacks,
        dinner: extractMealDataSimple(nonEmpty.map(l=>l.toLowerCase()), 'dinner') || menu.dinner,
      };
    }

    // 2. Bus data (priority: multi-category > week > simple)
    if (hasMultiCategory) {
      const advanced = parseMultiCategoryBusText(text);
      // Map advanced categories to a synthetic 7-day week (Mon-Fri working, Sat saturday, Sun sunday)
      const weekStart = deriveNearestMondayISO();
      const working = advanced.categories.working?.routes || { 'Nila → Sahyadri': [], 'Sahyadri → Nila': [] };
      const sat = advanced.categories.saturday?.routes || working;
      const sun = advanced.categories.sunday?.routes || working;
      const dayTemplate = (r) => ({ routes: { 'Nila → Sahyadri': r['Nila → Sahyadri'] || [], 'Sahyadri → Nila': r['Sahyadri → Nila'] || [] } });
      busWeek = {
        startDate: weekStart,
        days: [dayTemplate(working), dayTemplate(working), dayTemplate(working), dayTemplate(working), dayTemplate(working), dayTemplate(sat), dayTemplate(sun)]
      };
      busesFallback = { specials: advanced.specials };
    } else if (hasBusWeek) {
      busWeek = parseBusWeek(lines);
    } else {
      const simpleBus = parseSimpleBus(nonEmpty);
      if (simpleBus.routes.length) {
        busesFallback = { routes: simpleBus.routes };
      }
    }

    return { menu, menuCycle, busWeek, busesFallback };
  }

  function parseMenuCycle(lines) {
    const startIdx = lines.findIndex(l => /START MENU CYCLE:/i.test(l));
    const endIdx = lines.findIndex(l => /END MENU CYCLE/i.test(l));
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) throw new Error('Menu cycle block malformed');
    const header = lines[startIdx];
    const dateMatch = header.match(/START MENU CYCLE:\s*(\d{4}-\d{2}-\d{2})/i);
    if (!dateMatch) throw new Error('Menu cycle start date missing (YYYY-MM-DD)');
    const startDate = dateMatch[1];
    const block = lines.slice(startIdx + 1, endIdx).filter(Boolean);
    const dayRegex = /^Day\s*(\d{1,2})\s+(Breakfast|Lunch|Snacks|Dinner)\s*:\s*(.+)$/i;
    const days = Array.from({ length: 14 }, () => ({ breakfast: '', lunch: '', snacks: '', dinner: '' }));
    block.forEach(line => {
      const m = line.match(dayRegex);
      if (m) {
        const dayNum = parseInt(m[1], 10);
        if (dayNum >= 1 && dayNum <= 14) {
          const mealType = m[2].toLowerCase();
          const value = m[3].trim();
          days[dayNum - 1][mealType] = value;
        }
      }
    });
    return { startDate, days };
  }

  function parseBusWeek(lines) {
    const startIdx = lines.findIndex(l => /START BUS WEEK:/i.test(l));
    const endIdx = lines.findIndex(l => /END BUS WEEK/i.test(l));
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) throw new Error('Bus week block malformed');
    const header = lines[startIdx];
    const dateMatch = header.match(/START BUS WEEK:\s*(\d{4}-\d{2}-\d{2})/i);
    if (!dateMatch) throw new Error('Bus week start date missing (YYYY-MM-DD)');
    const startDate = dateMatch[1];
    const block = lines.slice(startIdx + 1, endIdx).filter(Boolean);
    const dayMap = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const routeRegex = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Nila\s*→?\s*Sahyadri|Sahyadri\s*→?\s*Nila)\s*:\s*(.+)$/i;
    const days = dayMap.map(() => ({ routes: { 'Nila → Sahyadri': [], 'Sahyadri → Nila': [] } }));
    block.forEach(line => {
      const m = line.match(routeRegex);
      if (m) {
        const dayIdx = dayMap.findIndex(d => d.toLowerCase() === m[1].toLowerCase());
        const routeRaw = m[2];
        const normRoute = /sahyadri/i.test(routeRaw) && /nila/i.test(routeRaw) && /sahyadri/i.test(routeRaw.split(/→|to|:/i)[0])
          ? 'Sahyadri → Nila'
          : /sahyadri/i.test(routeRaw) && /nila/i.test(routeRaw) ? (routeRaw.toLowerCase().startsWith('nila') ? 'Nila → Sahyadri' : 'Sahyadri → Nila') : routeRaw;
        const timesStr = m[3];
        const times = timesStr.split(/[,\s]+/).map(t => t.trim()).filter(Boolean).map(normalizeTimeToken);
        if (dayIdx >= 0) {
          days[dayIdx].routes[normRoute] = times;
        }
      }
    });
    return { startDate, days };
  }

  function normalizeTimeToken(t) {
    let x = t.replace(/\./g, ':');
    if (/^\d{1,2}$/.test(x)) x = x + ':00';
    if (/^\d{1,2}:\d{1}$/.test(x)) {
      const [h,m] = x.split(':'); x = h + ':' + m.padStart(2,'0');
    }
    return x;
  }

  function parseSimpleBus(lines) {
    const routes = [];
    lines.forEach(line => {
      if (line.includes('→') || line.includes('->')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const route = parts[0].trim().replace('->','→');
          const times = parts.slice(1).join(':').split(',').map(t=>t.trim()).filter(Boolean);
          if (times.length) routes.push({ route, times });
        }
      }
    });
    return { routes };
  }

  function deriveNearestMondayISO() {
    const d = new Date();
    const day = d.getDay(); // 0 Sun ... 6 Sat
    const diff = day === 1 ? 0 : (day === 0 ? -6 : 1 - day); // move back to Monday
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
    return monday.toISOString().slice(0,10);
  }

  function parse4WeekMenu(lines) {
    /* Expected format:
    START 4-WEEK MENU: 2025-10-06
    COMMON week13 Breakfast: bread, butter ...
    COMMON week13 Lunch: ...
    COMMON week24 Breakfast: ...
    MONDAY week13 Breakfast: Aloo Paratha ...
    MONDAY week24 Breakfast: ...
    TUESDAY week13 Lunch: ...
    ...
    (days: MONDAY..SUNDAY) (meals: Breakfast|Lunch|Snacks|Dinner)
    END 4-WEEK MENU
    */
    const startIdx = lines.findIndex(l => /START 4-WEEK MENU:/i.test(l));
    const endIdx = lines.findIndex(l => /END 4-WEEK MENU/i.test(l));
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) throw new Error('4-week menu block malformed');
    const header = lines[startIdx];
    const dateMatch = header.match(/START 4-WEEK MENU:\s*(\d{4}-\d{2}-\d{2})/i);
    const startDate = dateMatch ? dateMatch[1] : deriveNearestMondayISO();
    const block = lines.slice(startIdx + 1, endIdx).filter(Boolean);
    const menuData = {
      type: '4-week',
      startDate,
      weeks: {
        week13: { common: {}, days: {} },
        week24: { common: {}, days: {} }
      }
    };
    const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
    const mealNames = ['breakfast','lunch','snacks','dinner'];
    const lineRegex = /^(COMMON|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+(week13|week24)\s+(Breakfast|Lunch|Snacks|Dinner)\s*:\s*(.+)$/i;
    block.forEach(line => {
      const m = line.match(lineRegex);
      if (!m) return;
      const scope = m[1].toUpperCase();
      const weekKey = m[2].toLowerCase(); // week13 or week24
      const meal = m[3].toLowerCase();
      const value = m[4].trim();
      if (!menuData.weeks[weekKey]) return;
      if (scope === 'COMMON') {
        menuData.weeks[weekKey].common[meal] = value;
      } else {
        const dayLower = scope.toLowerCase();
        if (!menuData.weeks[weekKey].days[dayLower]) {
          menuData.weeks[weekKey].days[dayLower] = { breakfast:'', lunch:'', snacks:'', dinner:'' };
        }
        menuData.weeks[weekKey].days[dayLower][meal] = value;
      }
    });
    return menuData;
  }

  function getCurrentMenuFrom4Week(cycle) {
    const today = new Date();
    const start = new Date(cycle.startDate + 'T00:00:00');
    const diffDays = Math.floor((today - start) / 86400000);
    if (diffDays < 0) return null;
    const weekNum = Math.floor(diffDays / 7) % 4;
    const dayOfWeek = today.getDay();
    const weekType = (weekNum === 0 || weekNum === 2) ? 'week13' : 'week24';
    const weekData = cycle.weeks[weekType];
    if (!weekData) return null;
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayMenu = weekData.days[dayName];
    const common = weekData.common || {};
    
    return {
      breakfast: dayMenu?.breakfast || common.breakfast || '',
      lunch: dayMenu?.lunch || common.lunch || '',
      snacks: dayMenu?.snacks || common.snacks || '',
      dinner: dayMenu?.dinner || common.dinner || ''
    };
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Update Menu & Bus Schedule</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="help-text">
          <p><strong>Update Instructions:</strong></p>
          <p>Paste ANY of these blocks together. Missing blocks keep old data.</p>
          <ol style={{paddingLeft: '18px', margin: '8px 0'}}>
            <li>4-Week Menu (optional)</li>
            <li>14-day Menu Cycle (optional)</li>
            <li>7-day Bus Week (optional)</li>
            <li>Or simple single-day fallback (old format)</li>
          </ol>
          <div className="format-example">
<strong>4-Week Menu:</strong><br/>
START 4-WEEK MENU: 2025-10-06<br/>
COMMON week13 Breakfast: bread, butter, jam, milk, tea, coffee<br/>
COMMON week13 Lunch: pickle, papad ...<br/>
COMMON week24 Breakfast: bread, butter ...<br/>
MONDAY week13 Breakfast: Aloo Paratha, Curd<br/>
MONDAY week24 Breakfast: Upma, Chutney<br/>
TUESDAY week13 Lunch: Rice, Dal Fry<br/>
TUESDAY week24 Lunch: Lemon Rice, Rasam<br/>
... (list all meals; omit if same as common)<br/>
END 4-WEEK MENU
<br/><br/>
<strong>14-Day Menu Cycle:</strong><br/>
START MENU CYCLE: 2025-10-06<br/>
Day1 Breakfast: Idly, Vada<br/>
Day1 Lunch: Rice, Dal<br/>
... (list ALL meals up to Day14 Dinner)<br/>
Day14 Dinner: ...<br/>
END MENU CYCLE
<br/><br/>
<strong>7-Day Bus Week:</strong><br/>
START BUS WEEK: 2025-10-06<br/>
Mon Nila → Sahyadri: 08:00,09:00,10:00<br/>
Mon Sahyadri → Nila: 08:15,09:15,10:15<br/>
... (Tue .. Sun both routes)<br/>
Sun Sahyadri → Nila: ...<br/>
END BUS WEEK
<br/><br/>
<strong>Single-Day (fallback):</strong><br/>
Breakfast: Dosa, Chutney<br/>
Lunch: Rice, Curry<br/>
Snacks: Tea, Puff<br/>
Dinner: Chapati, Paneer<br/>
Nila → Sahyadri: 9:00, 10:00<br/>
Sahyadri → Nila: 9:15, 10:15
          </div>
        </div>

        <label className="field-label">Paste the menu and bus schedule text:</label>
        <textarea
          className="text-input"
          rows={10}
          placeholder="Paste your menu and bus schedule here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        {error && <div className="error-text">{error}</div>}

        <div className="quick-demo">
          <button 
            className="demo-btn" 
            onClick={() => setRawText(`Breakfast: Poha, Tea, Banana
Lunch: Rice, Dal, Sabzi, Roti
Snacks: Samosa, Chai
Dinner: Biryani, Raita, Papad

Nila → Sahyadri: 8:00 PM, 9:00 PM, 10:00 PM
Sahyadri → Nila: 8:15 PM, 9:15 PM, 10:15 PM`)}
          >
            Try Demo Data
          </button>
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save Data</button>
        </div>
      </div>
    </div>
  );
};

export default SimpleDataPanel;
