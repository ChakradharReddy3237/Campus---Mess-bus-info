import React, { useState } from 'react';

const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const meals = ['breakfast','lunch','snacks','dinner'];

function ensure(cycle){
  if(!cycle) cycle={ type:'4-week', startDate:'', weeks:{ week13:{common:{},days:{}}, week24:{common:{},days:{}} } };
  ['week13','week24'].forEach(w=>{
    if(!cycle.weeks[w]) cycle.weeks[w]={common:{},days:{}};
    meals.forEach(m=>{ if(cycle.weeks[w].common[m]===undefined) cycle.weeks[w].common[m]=''; });
    days.forEach(d=>{
      if(!cycle.weeks[w].days[d]) cycle.weeks[w].days[d]={};
      meals.forEach(m=>{ if(cycle.weeks[w].days[d][m]===undefined) cycle.weeks[w].days[d][m]=''; });
    });
  });
  return JSON.parse(JSON.stringify(cycle));
}

const Chip = ({children,onRemove}) => (
  <span className="menu-chip">{children}{onRemove && <button onClick={onRemove} className="chip-x" aria-label="Remove">×</button>}</span>
);

export default function AdvancedMenuEditor({ value, onChange }){
  const [cycle,setCycle]=useState(()=>ensure(value));
  const [week,setWeek]=useState('week13');
  const [meal,setMeal]=useState('breakfast');
  const [day,setDay]=useState('monday');
  const [input,setInput]=useState('');
  const [commonInput,setCommonInput]=useState('');
  const weekData = cycle.weeks[week];

  function commit(){
    onChange && onChange(cycle);
  }

    function addItem(){
      const text=input.trim(); if(!text) return;
      setCycle(c=>{ 
        const n=ensure(c); 
        const existingStr = n.weeks[week].days[day][meal] || ''; 
        const existing = parseItems(existingStr); 
        const items=splitItems(text); 
        items.forEach(it=>{ if(it && !existing.includes(it)) existing.push(it); }); 
        n.weeks[week].days[day][meal]=existing.join(', '); 
        return n; 
      });
      setInput('');
    }
  function addCommon(){
    const text=commonInput.trim(); if(!text) return;
    setCycle(c=>{ const n=ensure(c); const base=n.weeks[week].common[meal].split(/,\s*/).filter(Boolean); splitItems(text).forEach(it=>{ if(!base.includes(it)) base.push(it); }); n.weeks[week].common[meal]=base.join(', '); return n; });
    setCommonInput('');
  }
  function removeItem(it){ setCycle(c=>{ const n=ensure(c); const arr=parseItems(n.weeks[week].days[day][meal]); n.weeks[week].days[day][meal]=arr.filter(x=>x!==it).join(', '); return n; }); }
  function clearDay(){ setCycle(c=>{ const n=ensure(c); n.weeks[week].days[day][meal]=''; return n; }); }
  function copyCommonToAllDays(){
    setCycle(c=>{ const n=ensure(c); const commonItems = n.weeks[week].common[meal]; days.forEach(d=>{ n.weeks[week].days[d][meal]=commonItems; }); return n; });
  }
  function splitItems(text){ return text.split(/[,\n]+/).map(t=>t.trim()).filter(Boolean); }
  function parseItems(s){ return s? s.split(/,\s*/).filter(Boolean):[]; }

  const dayItems = parseItems(weekData.days[day][meal]);
  const commonItems = parseItems(weekData.common[meal]);

  return (
    <div className="adv-menu-editor">
      <div className="toolbar-row">
        <div className="seg-group">
          <span className="seg-label">Week</span>
          <button className={`seg-btn ${week==='week13'?'active':''}`} onClick={()=>setWeek('week13')}>1 & 3</button>
          <button className={`seg-btn ${week==='week24'?'active':''}`} onClick={()=>setWeek('week24')}>2 & 4</button>
        </div>
        <div className="seg-group">
          <span className="seg-label">Meal</span>
          {meals.map(m=> <button key={m} className={`seg-btn ${meal===m?'active':''}`} onClick={()=>setMeal(m)}>{m}</button>)}
        </div>
        <div className="seg-group">
          <span className="seg-label">Day</span>
          {days.map(d=> <button key={d} className={`seg-btn ${day===d?'active':''}`} onClick={()=>setDay(d)}>{d.slice(0,3)}</button>)}
        </div>
        <div className="seg-group">
          <span className="seg-label">Start Date</span>
          <input type="date" value={cycle.startDate||''} onChange={e=>{ const v=e.target.value; setCycle(c=>{ const n=ensure(c); n.startDate=v; return n; }); }} />
        </div>
        <button className="seg-btn action" onClick={()=>{ copyCommonToAllDays(); commit(); }}>Apply Common To All Days</button>
      </div>

      <div className="panel-row">
        <div className="panel">
          <div className="panel-title">Common ({meal})</div>
          <div className="chip-list">
            {commonItems.map(it=> <Chip key={it}>{it}</Chip>)}
            {commonItems.length===0 && <span className="empty-hint">No common items</span>}
          </div>
          <div className="add-line">
            <input placeholder="Add item(s)" value={commonInput} onChange={e=>setCommonInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ addCommon(); commit(); } }} />
            <button onClick={()=>{ addCommon(); commit(); }}>Add</button>
          </div>
          <small className="hint">Comma or newline separated. Common list acts as base for all days unless overridden.</small>
        </div>
        <div className="panel">
          <div className="panel-title">{day.slice(0,1).toUpperCase()+day.slice(1)} ({meal}) Overrides</div>
          <div className="chip-list">
            {dayItems.map(it=> <Chip key={it} onRemove={()=>{ removeItem(it); commit(); }}>{it}</Chip>)}
            {dayItems.length===0 && <span className="empty-hint">Inherits common ({commonItems.length} item{commonItems.length!==1?'s':''})</span>}
          </div>
          <div className="add-line">
            <input placeholder="Add item(s)" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ addItem(); commit(); } }} />
            <button onClick={()=>{ addItem(); commit(); }}>Add</button>
            {dayItems.length>0 && <button className="danger" onClick={()=>{ clearDay(); commit(); }}>Clear</button>}
          </div>
          <small className="hint">Overrides replace common set for this day. Leave empty to inherit.</small>
        </div>
      </div>
    </div>
  );
}