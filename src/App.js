import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import MessMenu from './components/MessMenu';
import CampusBus from './components/CampusBus';
import SimpleDataPanel from './components/SimpleDataPanel';
import DataUpdateModal from './components/DataUpdateModal';
import { loadData, saveData } from './utils/storage';

const DEFAULT_PREFERENCES = {
  hidePastTimes: true,
  countdown: true,
  holidayOverride: 'auto' // auto | working | saturday | sunday
};

// DEFAULT_DATA is intentionally minimal; real data loaded from public/data/*.json
const DEFAULT_DATA = {
  menu: { breakfast: '', lunch: '', snacks: '', dinner: '' },
  menuCycle: null,
  buses: {
    routes: [], // fallback if weekly or multi not loaded
    week: { startDate: null, days: [] },
    multi: null,
    specials: null
  },
  preferences: { ...DEFAULT_PREFERENCES }
};

class RootErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state = { error:null };
  }
  static getDerivedStateFromError(err){
    return { error: err };
  }
  componentDidCatch(err, info){
    // eslint-disable-next-line no-console
    console.error('App runtime error:', err, info);
  }
  render(){
    if(this.state.error){
      return (
        <div style={{padding:'1rem', fontFamily:'sans-serif'}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace:'pre-wrap', background:'#222', color:'#fff', padding:'8px', borderRadius:4, maxHeight:300, overflow:'auto'}}>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={()=>{localStorage.clear(); window.location.reload();}}>Clear Data & Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [data, setData] = useState(() => {
    const loaded = loadData();
    if (!loaded) return DEFAULT_DATA;
    // Defensive normalization for older localStorage versions
    const norm = { ...DEFAULT_DATA, ...loaded };
    norm.preferences = { ...DEFAULT_PREFERENCES, ...(loaded.preferences || {}) };
    // Ensure menuCycle shape or null
    if (norm.menuCycle && (!norm.menuCycle.type || !norm.menuCycle.weeks)) {
      norm.menuCycle = null; // fallback if malformed
    }
    // Buses
    const lb = loaded.buses || {};
    norm.buses = {
      routes: Array.isArray(lb.routes) ? lb.routes : [],
      week: lb.week && Array.isArray(lb.week.days) ? lb.week : { startDate: null, days: [] },
      multi: lb.multi || null,
      specials: lb.specials || null
    };
    return norm;
  });
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode] = useState('today'); // 'today' | 'tomorrow'
  const [now, setNow] = useState(() => new Date());

  // Real-time clock (minute resolution) to refresh UI (next bus highlight, day rollover)
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Initial fetch of external JSON (only if not already persisted)
  useEffect(() => {
    let cancelled = false;
    async function loadExternal() {
      try {
        // Fetch menu cycle
        const menuResp = await fetch('/data/menuCycle.json');
        if (menuResp.ok) {
          const menuJson = await menuResp.json();
          if (!cancelled) {
            setData(d => {
              // preserve any user-pasted overrides in localStorage
              if (d.menuCycle) return d; // already have cycle (user updated)
              const cycleStart = menuJson.startDate || menuJson.menuCycle?.startDate || null;
              // Derive today's menu for immediate display
              let derivedMenu = d.menu;
              try {
                if (menuJson && cycleStart) {
                  const tmpCycle = menuJson.type ? menuJson : menuJson.menuCycle;
                  const todayDerived = getMenuForDate(tmpCycle, new Date());
                  if (todayDerived) derivedMenu = todayDerived;
                }
              } catch {}
              return { ...d, menu: derivedMenu, menuCycle: menuJson };
            });
          }
        }
      } catch {}
      try {
        // Fetch bus schedule
        const busResp = await fetch('/data/busSchedule.json');
        if (busResp.ok) {
          const busJson = await busResp.json();
          if (!cancelled) {
            setData(d => {
              if (d.buses.multi) return d; // already have custom
              const multi = busJson.categories || null;
              return { ...d, buses: { ...d.buses, multi, specials: busJson.specials || null } };
            });
          }
        }
      } catch {}
    }
    // Only load if no persisted data (first visit) or missing pieces
    const persisted = loadData();
    if (!persisted || !persisted.menuCycle || !persisted.buses?.multi) {
      loadExternal();
    }
    return () => { cancelled = true; };
  }, []);

  // Use 'now' for current time reference
  const today = now;
  const dateOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  function getMenuForDate(cycle, date) {
    const start = new Date(cycle.startDate + 'T00:00:00');
    const diffDays = Math.floor((date - start) / 86400000);
    if (diffDays < 0) return null;
    const weekNum = Math.floor(diffDays / 7) % 4;
    const dayOfWeek = date.getDay();
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

  // Derive today's menu from 4-week cycle if available
  const todayMenu = useMemo(() => {
    const cycle = data.menuCycle;
    if (!cycle || !cycle.startDate || cycle.type !== '4-week' || !cycle.weeks) return data.menu;
    try {
      const targetDate = viewMode === 'tomorrow' ? new Date(today.getTime() + 86400000) : today;
      return getMenuForDate(cycle, targetDate) || data.menu;
    } catch { return data.menu; }
  }, [data.menuCycle, data.menu, today, viewMode]);

  const menuCycleMeta = useMemo(() => {
    const cycle = data.menuCycle;
    if (!cycle || !cycle.startDate || cycle.type !== '4-week') return null;
    const targetDate = viewMode === 'tomorrow' ? new Date(today.getTime() + 86400000) : today;
    const start = new Date(cycle.startDate + 'T00:00:00');
    const diffDays = Math.floor((targetDate - start) / 86400000);
    if (diffDays < 0) return null;
    const weekNum = Math.floor(diffDays / 7) % 4;
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, ...
    const weekType = (weekNum === 0 || weekNum === 2) ? 'week13' : 'week24';
    return { weekType, dayOfWeek, weekNum: weekNum + 1 };
  }, [data.menuCycle, today, viewMode]);

  // Derive today's bus schedule from week (7-day) if available
  const todayBusRoutes = useMemo(() => {
    const week = data.buses.week;
    if (!week || !week.startDate || !Array.isArray(week.days) || week.days.length !== 7) return data.buses.routes;
    try {
      const targetDate = viewMode === 'tomorrow' ? new Date(today.getTime() + 86400000) : today;
      const start = new Date(week.startDate + 'T00:00:00');
      const diffDays = Math.floor((targetDate - start) / 86400000);
      if (diffDays < 0) return data.buses.routes;
      const idx = diffDays % 7; // 0..6
      const dayObj = week.days[idx];
      if (!dayObj || !dayObj.routes) return data.buses.routes;
      return [
        { route: 'Nila → Sahyadri', times: dayObj.routes['Nila → Sahyadri'] || [] },
        { route: 'Sahyadri → Nila', times: dayObj.routes['Sahyadri → Nila'] || [] }
      ];
    } catch { return data.buses.routes; }
  }, [data.buses.week, data.buses.routes, today, viewMode]);

  function handlePrefToggle(key) {
    setData(d => ({ ...d, preferences: { ...d.preferences, [key]: !d.preferences[key] }}));
  }

  function handleHolidayOverride(e) {
    const value = e.target.value;
    setData(d => ({ ...d, preferences: { ...d.preferences, holidayOverride: value }}));
  }

  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'campus-dashboard-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }

  function updateMenuCycleStartDate(e) {
    const val = e.target.value || null;
    setData(d => ({ ...d, menuCycle: { ...d.menuCycle, startDate: val }}));
  }

  return (
    <div className="App">
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
      
      <header className="app-header">
        <div className="header-row">
          <h1>{viewMode === 'today' ? `Today (${formattedDate})` : `Tomorrow (${new Date(today.getTime() + 86400000).toLocaleDateString('en-US', dateOptions)})`}</h1>
          <div className="header-actions">
            <button className="ghost-btn" onClick={exportData} title="Download JSON">Export JSON</button>
            <button className="update-btn" onClick={()=>setShowUpdateModal(true)}>Update Data</button>
          </div>
        </div>
        <div className="day-tabs">
          <button 
            className={`day-tab ${viewMode === 'today' ? 'active' : ''}`}
            onClick={() => setViewMode('today')}
          >
            Today
          </button>
          <button 
            className={`day-tab ${viewMode === 'tomorrow' ? 'active' : ''}`}
            onClick={() => setViewMode('tomorrow')}
          >
            Tomorrow
          </button>
        </div>
      </header>

      <div className="prefs-bar">
        <div className="pref-group">
          <label className="switch">
            <input type="checkbox" checked={data.preferences.hidePastTimes} onChange={() => handlePrefToggle('hidePastTimes')} />
            <span>Hide Past Bus Times</span>
          </label>
        </div>
        <div className="pref-group">
          <label className="switch">
            <input type="checkbox" checked={data.preferences.countdown} onChange={() => handlePrefToggle('countdown')} />
            <span>Show Countdown</span>
          </label>
        </div>
        <div className="pref-group">
          <label>Holiday Mode:&nbsp;
            <select value={data.preferences.holidayOverride} onChange={handleHolidayOverride}>
              <option value="auto">Auto</option>
              <option value="working">Working</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </label>
        </div>
        {data.menuCycle && data.menuCycle.type === '4-week' && (
          <div className="pref-group">
            <label>Cycle Start:&nbsp;
              <input type="date" value={data.menuCycle.startDate || ''} onChange={updateMenuCycleStartDate} />
            </label>
          </div>
        )}
      </div>

      <div className="main-content">
        <MessMenu menu={todayMenu} cycleMeta={menuCycleMeta} />
        <CampusBus 
          routes={todayBusRoutes}
          multi={data.buses.multi} 
          specials={data.buses.specials}
          hidePastTimes={data.preferences.hidePastTimes}
            holidayOverride={data.preferences.holidayOverride}
          showCountdown={data.preferences.countdown}
          dayOffset={viewMode === 'tomorrow' ? 1 : 0}
          now={now}
        />
      </div>

      {showUpdateModal && (
        <DataUpdateModal
          data={data}
          onClose={()=>setShowUpdateModal(false)}
          onSave={(updated)=>{
            setData(updated);
            setShowUpdateModal(false);
            setNotification('Data updated');
            setTimeout(()=>setNotification(null),2500);
          }}
        />
      )}
    </div>
  );
}

export default function App(){
  return (
    <RootErrorBoundary>
      <AppInner />
    </RootErrorBoundary>
  );
}
