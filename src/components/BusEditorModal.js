import React, { useState } from 'react';

// Category and direction metadata
const categories = [
  { key:'working', label:'Working Days' },
  { key:'saturday', label:'Saturday / MF Holidays' },
  { key:'sunday', label:'Sunday' }
];
const directions = ['Nila → Sahyadri','Sahyadri → Nila'];

function ensureStructure(multi){
  if(!multi) multi={};
  categories.forEach(c=>{
    if(!multi[c.key]) multi[c.key]={ routes:{ 'Nila → Sahyadri':[], 'Sahyadri → Nila':[] } };
    directions.forEach(r=>{ if(!Array.isArray(multi[c.key].routes[r])) multi[c.key].routes[r]=[]; });
  });
  return JSON.parse(JSON.stringify(multi));
}

// Simple time validator; supports HH:MM (24h) or h:mm(am|pm)
function normalizeTimeInput(v){
  let t = v.trim();
  if(!t) return null;
  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if(ampm){
    let h = parseInt(ampm[1],10); const m=parseInt(ampm[2],10); const ap=ampm[3].toLowerCase();
    if(h<1||h>12||m>59) return null;
    if(ap==='pm' && h!==12) h+=12; if(ap==='am'&&h===12) h=0;
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if(m24){
    const h = parseInt(m24[1],10); const m = parseInt(m24[2],10);
    if(h>23||m>59) return null;
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  }
  // Allow just hour (e.g., 9) -> 09:00
  if(/^(\d{1,2})$/.test(t)){
    const h=parseInt(t,10); if(h>23) return null; return String(h).padStart(2,'0')+':00';
  }
  return null;
}

function sortTimes(list){
  return [...list].sort((a,b)=>a.localeCompare(b, undefined, { numeric:true }));
}

const Chip = ({children,onDelete}) => (
  <span className="chip">
    {children}
    {onDelete && <button className="chip-del" onClick={onDelete} aria-label="Remove">×</button>}
  </span>
);

const BusEditorModal = ({ value, specials, onSave, onClose }) => {
  const [multi,setMulti] = useState(()=>ensureStructure(value));
  const [activeCat,setActiveCat] = useState('working');
  const [inputs,setInputs] = useState(()=>({
    'working|Nila → Sahyadri':'',
    'working|Sahyadri → Nila':'',
    'saturday|Nila → Sahyadri':'',
    'saturday|Sahyadri → Nila':'',
    'sunday|Nila → Sahyadri':'',
    'sunday|Sahyadri → Nila':''
  }));
  const [errors,setErrors] = useState({});
  const [showBatch,setShowBatch] = useState(false);
  const [spec,setSpec] = useState(()=>({
    palakkadTown: specials?.palakkadTown || [],
    wisePark: specials?.wisePark || []
  }));
  const [specInput,setSpecInput] = useState({ palakkadTown:'', wisePark:'' });

  function addTime(cat, dir){
    const key = cat+'|'+dir;
    const raw = inputs[key];
    const norm = normalizeTimeInput(raw);
    if(!norm){
      setErrors(e=>({...e,[key]:'Invalid time'}));
      return;
    }
    setMulti(m=>{ const n=ensureStructure(m); if(!n[cat].routes[dir].includes(norm)){ n[cat].routes[dir].push(norm); n[cat].routes[dir]=sortTimes(n[cat].routes[dir]); } return n; });
    setInputs(i=>({...i,[key]:''}));
    setErrors(e=>{ const { [key]:_, ...rest}=e; return rest; });
  }
  function deleteTime(cat, dir, t){
    setMulti(m=>{ const n=ensureStructure(m); n[cat].routes[dir]=n[cat].routes[dir].filter(x=>x!==t); return n; });
  }
  function handleBatch(cat, dir, text){
    const tokens = text.split(/[\n,\s]+/).map(t=>normalizeTimeInput(t)||'').filter(Boolean);
    const uniq = Array.from(new Set(tokens));
    setMulti(m=>{ const n=ensureStructure(m); n[cat].routes[dir]=sortTimes(uniq); return n; });
  }
  function addSpecial(kind){
    const val = specInput[kind].trim(); if(!val) return;
    setSpec(s=>({...s,[kind]:[...s[kind], val]}));
    setSpecInput(s=>({...s,[kind]:''}));
  }
  function removeSpecial(kind, idx){
    setSpec(s=>({...s,[kind]:s[kind].filter((_,i)=>i!==idx)}));
  }
  function handleSave(){
    onSave({ multi, specials: spec });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal large">
        <div className="modal-header">
          <h3>Edit Bus Timings</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="bus-editor-tabs">
          {categories.map(c=> (
            <button key={c.key} className={`bus-editor-tab ${c.key===activeCat?'active':''}`} onClick={()=>setActiveCat(c.key)}>{c.label}</button>
          ))}
          <div style={{flex:1}} />
          <button className="mini-toggle" onClick={()=>setShowBatch(s=>!s)}>{showBatch?'Simple Mode':'Batch Paste'}</button>
        </div>
        <div className="editor-section">
          {directions.map(dir => {
            const list = multi[activeCat].routes[dir];
            const key = activeCat+'|'+dir;
            return (
              <div key={dir} className="dir-block">
                <h4>{dir}</h4>
                <div className="chips-row">
                  {list.map(t=> <Chip key={t} onDelete={()=>deleteTime(activeCat, dir, t)}>{t}</Chip>)}
                  {list.length===0 && <span className="empty-hint">No times</span>}
                </div>
                {!showBatch && (
                  <div className="add-row">
                    <input
                      className={`time-input ${errors[key]?'invalid':''}`}
                      placeholder="HH:MM or h:mmam"
                      value={inputs[key]}
                      onChange={e=>setInputs(i=>({...i,[key]:e.target.value}))}
                      onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addTime(activeCat, dir); } }}
                    />
                    <button className="add-btn" onClick={()=>addTime(activeCat, dir)}>Add</button>
                    {errors[key] && <span className="err-msg">{errors[key]}</span>}
                  </div>
                )}
                {showBatch && (
                  <textarea
                    className="batch-area"
                    rows={4}
                    placeholder="Paste times separated by space, comma or newline"
                    defaultValue={list.join(' ')}
                    onBlur={e=>handleBatch(activeCat, dir, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="specials-editor">
          <h4>Special Routes</h4>
          {['palakkadTown','wisePark'].map(kind => (
            <div key={kind} className="special-block-edit">
              <div className="special-header">
                <strong>{kind==='palakkadTown'?'Palakkad Town':'Wise Park Junction'}</strong>
              </div>
              <div className="chips-row">
                {spec[kind].map((s,i)=> <Chip key={i} onDelete={()=>removeSpecial(kind,i)}>{s}</Chip>)}
                {spec[kind].length===0 && <span className="empty-hint">None</span>}
              </div>
              <div className="add-row">
                <input
                  placeholder="Add note / timing"
                  value={specInput[kind]}
                  onChange={e=>setSpecInput(v=>({...v,[kind]:e.target.value}))}
                  onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addSpecial(kind);} }}
                />
                <button className="add-btn" onClick={()=>addSpecial(kind)}>Add</button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default BusEditorModal;
