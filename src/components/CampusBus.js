import React, { useEffect, useMemo, useState } from 'react';

const CATEGORY_LABELS = {
  working: 'Working Days',
  saturday: 'Sat / MF Holidays',
  sunday: 'Sundays'
};

function highlightDuplicates(times) {
  const counts = times.reduce((acc, t) => { acc[t] = (acc[t]||0)+1; return acc; }, {});
  return times.map(t => ({ value: t, dup: counts[t] > 1 }));
}

function parseToMinutes(t) {
  if (!t) return null;
  const raw = t.trim();
  // 12-hour with AM/PM
  let ampmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1],10);
    const m = parseInt(ampmMatch[2],10);
    const ap = ampmMatch[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h*60 + m;
  }
  // Also support times like 9:00PM without space
  ampmMatch = raw.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1],10);
    const m = parseInt(ampmMatch[2],10);
    const ap = ampmMatch[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h*60 + m;
  }
  // 24-hour HH:MM
  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = parseInt(m24[1],10);
    const m = parseInt(m24[2],10);
    return h*60 + m;
  }
  return null;
}

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

const CampusBus = ({ routes = [], multi, specials, hidePastTimes, holidayOverride = 'auto', showCountdown, dayOffset = 0, now: externalNow }) => {
  const hasMulti = !!multi;
  const [showSpecials, setShowSpecials] = useState(false);
  const [showAll, setShowAll] = useState(false); // user toggle to view past times
  const [internalNow, setInternalNow] = useState(new Date());
  const [manualCat, setManualCat] = useState('auto'); // auto uses logic; otherwise 'working'|'saturday'|'sunday'
  useEffect(() => {
    // higher resolution for countdown (< 60 min) – update every 15s
    const id = setInterval(() => setInternalNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  const now = externalNow || internalNow;
  const tzLabel = useMemo(() => new Intl.DateTimeFormat('en-IN',{ timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hour12:true }).format(now), [now]);

  const { todayRoutes, categoryLabel, activeKey } = useMemo(() => {
    if (!hasMulti) {
      return { todayRoutes: routes, categoryLabel: 'Bus', activeKey: 'single' };
    }
    const baseDate = new Date();
    const baseDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset).getDay();
    let derivedKey = 'working';
    const effectiveDay = holidayOverride === 'auto' ? baseDay : (holidayOverride === 'sunday' ? 0 : holidayOverride === 'saturday' ? 6 : 3);
    if (effectiveDay === 0) derivedKey = 'sunday';
    else if (effectiveDay === 6) derivedKey = 'saturday';
    const key = manualCat === 'auto' ? derivedKey : manualCat;
    const cat = multi[key];
    if (!cat) return { todayRoutes: routes, categoryLabel: 'Bus', activeKey: key };
    return {
      todayRoutes: [
        { route: 'Nila → Sahyadri', times: cat.routes['Nila → Sahyadri'] || [] },
        { route: 'Sahyadri → Nila', times: cat.routes['Sahyadri → Nila'] || [] }
      ],
      categoryLabel: CATEGORY_LABELS[key] || 'Bus',
      activeKey: key
    };
  }, [multi, hasMulti, routes, holidayOverride, manualCat, dayOffset]);

  // Preprocess times to infer afternoon (PM) for schedules written in 12h without AM/PM.
  // Heuristic: within a single route list, times should be non-decreasing; if a time's raw minutes value is less than the previous, add 12h (720m). Applies at most once (midday).
  const processedRoutes = useMemo(()=>{
    return todayRoutes.map(routeObj => {
      let addedSpan = 0; // number of half-day (12h) increments applied (0 or 1 typical)
      let last = null;
      const processed = routeObj.times.map(raw => {
        const base = parseToMinutes(raw);
        if(base == null) return { raw, minutes: null };
        let minutes = base + addedSpan*720;
        if(last != null && minutes < last) {
          // assume midday rollover, add 12h
            addedSpan += 1;
            minutes = base + addedSpan*720;
        }
        last = minutes;
        return { raw, minutes };
      });
      return { ...routeObj, processed };
    });
  }, [todayRoutes]);

  // Next bus detection across processed lists
  let nowMin = getCurrentTimeMinutes();
  if(dayOffset === 1) nowMin = 0;
  const allTimes = processedRoutes.flatMap(r => r.processed.map((p, idx) => ({ route: r.route, time: p.raw, minutes: p.minutes, index: idx })));
  const future = allTimes.filter(x => x.minutes != null && x.minutes > nowMin).sort((a,b)=>a.minutes-b.minutes);
  const next = future[0];

  const countdown = useMemo(() => {
    if (!showCountdown || !next) return null;
    const diff = (next.minutes*60*1000) - (nowMin*60*1000);
    if (diff <= 0) return null;
    const mins = Math.floor(diff/60000);
    if (mins < 1) {
      const secs = Math.floor(diff/1000);
      return secs + ' s';
    }
    if (mins < 60) return mins + ' min';
    const h = Math.floor(mins/60);
    const m = mins % 60;
    return h + 'h' + (m? ' ' + m + 'm':'');
  }, [next, nowMin, showCountdown, now]);

  // Enhanced time rendering with next highlight and past dimming
  const renderTimeSlots = (times, routeName, processed) => {
    return highlightDuplicates(times).map((tObj, index) => {
      const proc = processed[index];
      const timeMin = proc ? proc.minutes : parseToMinutes(tObj.value);
      const isPast = timeMin != null && timeMin <= nowMin;
      const isNext = next && next.time === tObj.value && next.route === routeName && next.index === index;
      if (hidePastTimes && !showAll && isPast && !isNext) return null;
      return (
        <button
          key={index}
          className={`time-slot ${tObj.dup ? 'dup' : ''} ${isPast ? 'past' : ''} ${isNext ? 'next' : ''}`}
          title={tObj.dup ? 'Multiple buses at this time' : isNext ? 'Next bus' : isPast ? 'Time passed' : ''}
        >
          {tObj.value}
        </button>
      );
    });
  };

  // Split upcoming vs past (for expanded view)
  const upcoming = future;
  const past = allTimes.filter(x=>x.minutes!=null && x.minutes <= nowMin).sort((a,b)=>a.minutes-b.minutes);

  return (
    <div className="campus-bus redesigned">
      <div className="bus-header-top">
        <div className="title-stack">
          <h2>Campus Bus</h2>
          <div className="sub-time">India (IST) {tzLabel}</div>
        </div>
        {next && (
          <div className="next-box" title={next.route}>
            <div className="next-label">Next Bus</div>
            <div className="next-time">{next.time}</div>
            {countdown && <div className="next-count">in {countdown}</div>}
            <div className="next-route">{next.route}</div>
          </div>
        )}
      </div>

      {hasMulti && (
        <div className="cat-tabs">
          <button className={`cat-tab ${manualCat==='auto'?'active':''}`} onClick={()=>setManualCat('auto')}>Auto ({categoryLabel})</button>
          <button className={`cat-tab ${activeKey==='working' && manualCat==='working'?'active':''}`} onClick={()=>setManualCat('working')}>Working</button>
          <button className={`cat-tab ${activeKey==='saturday' && manualCat==='saturday'?'active':''}`} onClick={()=>setManualCat('saturday')}>Saturday</button>
          <button className={`cat-tab ${activeKey==='sunday' && manualCat==='sunday'?'active':''}`} onClick={()=>setManualCat('sunday')}>Sunday</button>
          <div className="flex-spacer" />
          {hidePastTimes && (
            <button className="small-btn" onClick={()=>setShowAll(s=>!s)}>{showAll? 'Hide Past':'Show Past'}</button>
          )}
          <button className="small-btn" onClick={()=>setShowSpecials(s=>!s)}>{showSpecials? 'Hide Specials':'Specials'}</button>
        </div>
      )}
      {hasMulti && (
        <div className="cat-help">
          <div className="date-line">
            Date: {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'short', year:'numeric'})}
          </div>
          <p>
            Auto picks schedule based on today (or holiday override). Click Working / Saturday / Sunday to force a different timetable.
            Current: <strong>{categoryLabel}{manualCat!=='auto' ? ' (manual)' : ''}</strong>
          </p>
        </div>
      )}

      <div className="routes-grid">
        {processedRoutes.map(r=> (
          <div key={r.route} className="route-card">
            <div className="route-head">{r.route}</div>
            <div className="slots-wrap">
              {renderTimeSlots(r.times, r.route, r.processed)}
            </div>
          </div>
        ))}
      </div>
      {future.length === 0 && (
        <div style={{marginTop:12, fontSize:'0.65rem', opacity:0.7}}>
          No future buses detected with current format. If afternoon times show as past, edit schedule to use 24h (e.g. 13:00 for 1 PM) or toggle "Show Past".
        </div>
      )}

      {showAll && past.length>0 && (
        <div className="past-section">
          <h4 className="section-title">Past Today</h4>
          <div className="past-chips">
            {past.slice(-40).map((p,i)=>(
              <span key={i} className="past-chip" title={p.route}>{p.time}</span>
            ))}
          </div>
        </div>
      )}

      {showSpecials && specials && (specials.palakkadTown?.length || specials.wisePark?.length) && (
        <div className="specials-panel">
          {specials.palakkadTown?.length>0 && (
            <div className="special-col">
              <h4>Palakkad Town</h4>
              <ul>{specials.palakkadTown.map((s,i)=><li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {specials.wisePark?.length>0 && (
            <div className="special-col">
              <h4>Wise Park Junction</h4>
              <ul>{specials.wisePark.map((s,i)=><li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CampusBus;
