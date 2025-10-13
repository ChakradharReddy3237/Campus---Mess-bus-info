import React, { useEffect, useState } from 'react';
import './App.css';
import MessMenu from './components/MessMenu';
import CampusBus from './components/CampusBus';
import DataUpdateModal from './components/DataUpdateModal';
import { loadData, saveData } from './utils/storage';

async function fetchJson(path) { try { const r = await fetch(path); if(!r.ok) throw new Error(path); return r.json(); } catch { return null; } }

export default function App(){
	const [menu,setMenu] = useState(null);
	const [buses,setBuses] = useState(null);
	const [open,setOpen] = useState(false);
	const [loading,setLoading] = useState(true);

	useEffect(()=>{
		const stored = loadData();
		if(stored.weeks || stored.menuCycle) setMenu(stored.menuCycle || { weeks: stored.weeks });
		if(stored.busSchedule || stored.categories) setBuses(stored.busSchedule || { categories: stored.categories, specials: stored.specials||[] });
		Promise.all([
			!stored.menuCycle && fetchJson('/data/menuCycle.json'),
			!stored.busSchedule && fetchJson('/data/busSchedule.json')
		]).then(([mc,bs])=>{
			if(mc && !menu) setMenu(mc);
			if(bs && !buses) setBuses(bs);
		}).finally(()=> setLoading(false));
	},[]);

	useEffect(()=>{ saveData({ menuCycle: menu, busSchedule: buses }); },[menu,buses]);

	if(loading) return <div className="app-shell"><h2>Loading…</h2></div>;

	return (
		<div className="app-shell">
			<header className="top-bar">
				<h1>Campus Dashboard</h1>
				<div className="actions">
					<button onClick={()=>setOpen(true)}>Update Data</button>
				</div>
			</header>
			<main className="grid-2">
				<MessMenu data={menu} />
				<CampusBus data={buses} />
			</main>
			<p className="note">Edits are stored only in this browser (localStorage). Export/backup feature can be added later.</p>
			<DataUpdateModal
				open={open}
				onClose={()=>setOpen(false)}
				menuValue={menu}
				busValue={buses}
				onMenuChange={(v)=> setMenu(v)}
				onBusChange={(v)=> setBuses(v)}
				onImport={(v)=> {
					if(v.weeks) setMenu({ weeks: v.weeks });
					if(v.categories) setBuses({ categories: v.categories, specials: v.specials||[] });
				}}
			/>
		</div>
	);
}
