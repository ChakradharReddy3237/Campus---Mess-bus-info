import React, { useState } from 'react';
import { parseMultiCategoryBusText } from '../utils/busParser';
import BusEditorModal from './BusEditorModal';
import AdvancedMenuEditor from './AdvancedMenuEditor';

// Wrapper provides tabbed interface combining existing editors plus JSON import.
const TABS = [
  { key:'menu', label:'Menu' },
  { key:'buses', label:'Buses' },
  { key:'import', label:'Import JSON/Text' }
];

export default function DataUpdateModal({ data, onSave, onClose }) {
  const [active, setActive] = useState('menu');
  const [workingData, setWorkingData] = useState(()=>JSON.parse(JSON.stringify(data)));
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  function updateMenuCycle(cycle){
    setWorkingData(d=>({ ...d, menuCycle: cycle }));
  }
  function updateBuses(multi, specials){
    setWorkingData(d=>({ ...d, buses:{ ...d.buses, multi, specials }}));
  }

  function applyImport(){
    setImportError('');
    if(!importText.trim()) { setImportError('Nothing to import'); return; }
    try {
      // Try JSON first
      if(/^[{\[]/.test(importText.trim())){
        const parsed = JSON.parse(importText);
        setWorkingData(d=>({ ...d, ...parsed, buses:{ ...d.buses, ...(parsed.buses||{}) } }));
        return;
      }
      // Else attempt multi-category bus text parse
      const adv = parseMultiCategoryBusText(importText);
      if(adv && adv.categories){
        setWorkingData(d=>({ ...d, buses:{ ...d.buses, multi: adv.categories, specials: adv.specials }}));
      }
    } catch(e){
      setImportError(e.message || 'Import failed');
    }
  }

  function handleSave(){
    onSave(workingData);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal data-update-modal">
        <div className="modal-header">
          <h3>Update Data</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="update-tabs">
          {TABS.map(t=> (
            <button key={t.key} className={`update-tab ${t.key===active?'active':''}`} onClick={()=>setActive(t.key)}>{t.label}</button>
          ))}
        </div>
        <div className="update-body">
          {active==='menu' && (
            <div className="embedded-editor">
              <AdvancedMenuEditor value={workingData.menuCycle} onChange={(c)=>updateMenuCycle(c)} />
            </div>
          )}
          {active==='buses' && (
            <div className="embedded-editor">
              <BusEditorModal value={workingData.buses.multi} specials={workingData.buses.specials} onSave={({multi,specials})=>updateBuses(multi,specials)} onClose={()=>{}} />
            </div>
          )}
          {active==='import' && (
            <div className="import-pane">
              <textarea className="text-input" rows={12} placeholder="Paste JSON or timetable text here" value={importText} onChange={e=>setImportText(e.target.value)} />
              {importError && <div className="error-text" style={{marginTop:8}}>{importError}</div>}
              <button className="primary-btn" style={{marginTop:8}} onClick={applyImport}>Apply Import</button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save All</button>
        </div>
      </div>
    </div>
  );
}