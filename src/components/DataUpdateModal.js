import React, { useState } from 'react';
import AdvancedMenuEditor from './AdvancedMenuEditor';
import BusEditorModal from './BusEditorModal';

export default function DataUpdateModal({ open, onClose, menuValue, busValue, onMenuChange, onBusChange, onImport }) {
	const [tab,setTab] = useState('menu');
	const [importText,setImportText] = useState('');
	if(!open) return null;

	function handleImport(){
		try {
			const parsed = JSON.parse(importText);
			onImport && onImport(parsed);
			setImportText('');
		} catch (e) {
			alert('Invalid JSON');
		}
	}

	return (
		<div className="modal-overlay">
			<div className="modal">
				<div className="modal-header">
					<h2>Update Data</h2>
					<button onClick={onClose}>✕</button>
				</div>
				<div className="tabs">
					<button className={tab==='menu'? 'active':''} onClick={()=>setTab('menu')}>Menu</button>
					<button className={tab==='bus'? 'active':''} onClick={()=>setTab('bus')}>Buses</button>
					<button className={tab==='import'? 'active':''} onClick={()=>setTab('import')}>Import JSON</button>
				</div>
				<div className="tab-body">
					{tab==='menu' && <AdvancedMenuEditor value={menuValue} onChange={onMenuChange} />}
					{tab==='bus' && <BusEditorModal value={busValue} onChange={onBusChange} />}
					{tab==='import' && (
						<div className="import-panel">
							<textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder='Paste JSON with { "weeks": [...], "categories": {...} }'/>
							<button onClick={handleImport}>Import</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
