import React, { useState } from 'react';

// Lightweight editor for 4-week cycle: week13 (weeks 1 & 3) and week24 (weeks 2 & 4)
// Allows editing common meals and per-day overrides.
const dayKeys = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const mealKeys = ['breakfast','lunch','snacks','dinner'];

function ensureStructure(cycle){
  if(!cycle) cycle = { type:'4-week', startDate:'', weeks:{ week13:{common:{},days:{}}, week24:{common:{},days:{}} } };
  ['week13','week24'].forEach(w=>{
    if(!cycle.weeks[w]) cycle.weeks[w]={common:{},days:{}};
    mealKeys.forEach(m=>{ if(cycle.weeks[w].common[m]===undefined) cycle.weeks[w].common[m]=''; });
    dayKeys.forEach(d=>{
      if(!cycle.weeks[w].days[d]) cycle.weeks[w].days[d]={};
      mealKeys.forEach(m=>{ if(cycle.weeks[w].days[d][m]===undefined) cycle.weeks[w].days[d][m]=''; });
    });
  });
  return JSON.parse(JSON.stringify(cycle));
}

const MenuEditorModal = ({ value, onSave, onClose }) => {
  const [cycle,setCycle] = useState(()=>ensureStructure(value));
  const [activeWeek,setActiveWeek] = useState('week13');
  const [showOverrides,setShowOverrides] = useState(true);
  const [viewMode,setViewMode] = useState('grid'); // grid | meal
  const [activeMeal,setActiveMeal] = useState('breakfast');

  function updateCommon(week, meal, val){ setCycle(c=>{ const n=ensureStructure(c); n.weeks[week].common[meal]=val; return n; }); }
  function updateDay(week, day, meal, val){ setCycle(c=>{ const n=ensureStructure(c); n.weeks[week].days[day][meal]=val; return n; }); }
  function handleSave(){ onSave(cycle); }

  const weekLabel = activeWeek==='week13' ? 'Week 1 & 3' : 'Week 2 & 4';

  const weekData = cycle.weeks[activeWeek];

  const grid = (
    <table className="menu-grid">
      <thead>
        <tr>
          <th>Meal / Day</th>
          {dayKeys.map(d=> <th key={d}>{d.slice(0,3).toUpperCase()}</th>)}
        </tr>
      </thead>
      <tbody>
        {mealKeys.map(meal => (
          <tr key={meal}>
            <td className="meal-col">
              <div className="meal-name">{meal}</div>
              <textarea
                className="common-input"
                rows={2}
                placeholder="Common"
                value={cycle.weeks[activeWeek].common[meal]}
                onChange={e=>updateCommon(activeWeek, meal, e.target.value)}
              />
            </td>
            {dayKeys.map(day => {
              const val = cycle.weeks[activeWeek].days[day][meal];
              const overridden = !!val;
              return (
                <td key={day} className={overridden? 'override-cell':''}>
                  {showOverrides && (
                    <textarea
                      rows={2}
                      placeholder={cycle.weeks[activeWeek].common[meal] || '(inherit)'}
                      value={val}
                      onChange={e=>updateDay(activeWeek, day, meal, e.target.value)}
                    />
                  )}
                  {!showOverrides && (
                    <div className="inherit-view">{val || '—'}</div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const mealFocused = (
    <div className="meal-focus-wrapper">
      <div className="meal-focus-head">
        <div className="meal-focus-title">{activeMeal} <span className="inherit-hint">Common value acts as default</span></div>
        <textarea
          className="common-input"
          rows={2}
          placeholder="Common meal items"
          value={weekData.common[activeMeal]}
          onChange={e=>updateCommon(activeWeek,activeMeal,e.target.value)}
        />
      </div>
      <div className="meal-focus-days">
        {dayKeys.map(day=>{
          const val = weekData.days[day][activeMeal];
          const overridden = !!val;
          return (
            <div key={day} className={`meal-day-item ${overridden?'overridden':''}`}> 
              <div className="day-label">{day.slice(0,3).toUpperCase()}</div>
              <textarea
                rows={2}
                placeholder={weekData.common[activeMeal] || '(inherit common)'}
                value={val}
                onChange={e=>updateDay(activeWeek, day, activeMeal, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="embedded-menu-editor">
      <div className="menu-editor-bar">
        <div className="week-switch">
          <button className={activeWeek==='week13'? 'mini-btn active':'mini-btn'} onClick={()=>setActiveWeek('week13')}>Week 1&3</button>
          <button className={activeWeek==='week24'? 'mini-btn active':'mini-btn'} onClick={()=>setActiveWeek('week24')}>Week 2&4</button>
        </div>
        <div className="view-switch">
          <button className={viewMode==='grid'?'mini-btn active':'mini-btn'} onClick={()=>setViewMode('grid')}>Full Grid</button>
          <button className={viewMode==='meal'?'mini-btn active':'mini-btn'} onClick={()=>setViewMode('meal')}>Meal Focus</button>
        </div>
        {viewMode==='grid' && (
          <button className="mini-btn" onClick={()=>setShowOverrides(s=>!s)}>{showOverrides? 'Hide Overrides':'Show Overrides'}</button>
        )}
        {viewMode==='meal' && (
          <div className="meal-tabs">
            {mealKeys.map(m=> (
              <button key={m} className={`meal-tab ${m===activeMeal?'active':''}`} onClick={()=>setActiveMeal(m)}>{m}</button>
            ))}
          </div>
        )}
        {onClose && <button className="mini-btn" onClick={onClose}>Close</button>}
        <button className="mini-btn primary" onClick={handleSave}>Save</button>
      </div>
      <div className="week-label">{weekLabel}</div>
      {viewMode==='grid' && <div className="menu-grid-wrapper">{grid}</div>}
      {viewMode==='meal' && <div className="meal-focus-container">{mealFocused}</div>}
      <div className="menu-legend">
        <span className="legend-item"><span className="legend-box override"></span>Overridden cell</span>
        <span className="legend-item"><span className="legend-box inherit"></span>Inherited (empty uses common)</span>
      </div>
    </div>
  );
};

export default MenuEditorModal;
