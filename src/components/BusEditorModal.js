import React, { useState } from 'react';

function normalize(schedule) {
	return schedule || { categories: {}, specials: [] };
}

function timeValid(t){
	return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);
}

export default function BusEditorModal({ value, onChange }) {
	const [data,setData] = useState(()=> normalize(value));
	const [category,setCategory] = useState(Object.keys(data.categories)[0] || 'Weekday');
	const [direction,setDirection] = useState('toCampus');
	const [time,setTime] = useState('');
	const [specialLabel,setSpecialLabel] = useState('');
	const [specialTime,setSpecialTime] = useState('');

	function ensureCategory(name){
		if(!data.categories[name]) {
			const next = { ...data, categories: { ...data.categories, [name]: { toCampus: [], fromCampus: [] } } };
			update(next);
		}
	}

	function update(next){
		setData(next);
		onChange && onChange(next);
	}

	function addTime(){
		const t = time.trim();
		if(!timeValid(t)) return;
		ensureCategory(category);
		const cat = data.categories[category];
		const nextTimes = [...cat[direction], t].filter((v,i,a)=>a.indexOf(v)===i).sort();
		const next = { ...data, categories: { ...data.categories, [category]: { ...cat, [direction]: nextTimes } } };
		update(next);
		setTime('');
	}

	function removeTime(t){
		const cat = data.categories[category];
		const nextCat = { ...cat, [direction]: cat[direction].filter(x=>x!==t) };
		const next = { ...data, categories: { ...data.categories, [category]: nextCat } };
		update(next);
	}

	function addSpecial(){
		const lbl = specialLabel.trim();
		const tim = specialTime.trim();
		if(!lbl || !timeValid(tim)) return;
		const next = { ...data, specials: [...data.specials, { label: lbl, time: tim }] };
		update(next);
		setSpecialLabel(''); setSpecialTime('');
	}

	function removeSpecial(idx){
		const next = { ...data, specials: data.specials.filter((_,i)=>i!==idx) };
		update(next);
	}

	const catNames = Object.keys(data.categories);
	const times = data.categories[category]?.[direction] || [];

	return (
		<div className="bus-editor">
			<h3>Bus Schedule Editor</h3>
			<div className="row">
				<label>Category:</label>
				<select value={category} onChange={e=>{setCategory(e.target.value); ensureCategory(e.target.value);}}>
					{catNames.map(c=> <option key={c}>{c}</option>)}
					{!catNames.includes('Weekday') && <option>Weekday</option>}
				</select>
				<input placeholder="New category" onKeyDown={e=>{ if(e.key==='Enter'){ ensureCategory(e.target.value.trim()); setCategory(e.target.value.trim()); } }} />
				<div className="segmented-inline">
					{['toCampus','fromCampus'].map(d=> <button key={d} className={d===direction? 'active':''} onClick={()=>setDirection(d)}>{d}</button>)}
				</div>
			</div>
			<div className="times-box">
				{times.map(t=> <span key={t} className="chip" onClick={()=>removeTime(t)}>{t} ✕</span>)}
			</div>
			<form onSubmit={e=>{e.preventDefault(); addTime();}} className="add-form">
				<input value={time} onChange={e=>setTime(e.target.value)} placeholder="HH:MM" />
				<button type="submit">Add Time</button>
			</form>
			<hr />
			<h4>Specials</h4>
			<div className="times-box">
				{data.specials.map((s,i)=> <span key={i} className="chip special" onClick={()=>removeSpecial(i)}>{s.time} {s.label} ✕</span>)}
			</div>
			<form onSubmit={e=>{e.preventDefault(); addSpecial();}} className="add-form">
				<input value={specialTime} onChange={e=>setSpecialTime(e.target.value)} placeholder="HH:MM" />
				<input value={specialLabel} onChange={e=>setSpecialLabel(e.target.value)} placeholder="Label" />
				<button type="submit">Add Special</button>
			</form>
		</div>
	);
}
