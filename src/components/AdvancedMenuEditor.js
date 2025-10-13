import React, { useState, useEffect, useCallback } from 'react';
import '../App.css';

// Utility to ensure structure
function initStructure(weeks = []) {
	if (!Array.isArray(weeks) || weeks.length === 0) {
		return [1,2].map((i)=>({ week: i, days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>({ day:d, meals:{ breakfast:[], lunch:[], snacks:[], dinner:[] }})) }));
	}
	return weeks.map(w=>({
		week: w.week,
		days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>{
			const existing = (w.days||[]).find(x=>x.day===d) || { meals:{} };
			const meals = existing.meals||{};
			return { day:d, meals: { breakfast: meals.breakfast||[], lunch: meals.lunch||[], snacks: meals.snacks||[], dinner: meals.dinner||[] } };
		})
	}));
}

const MEALS = ['breakfast','lunch','snacks','dinner'];

export default function AdvancedMenuEditor({ value, onChange }) {
	const [weeks, setWeeks] = useState(initStructure(value?.weeks));
	const [weekIndex, setWeekIndex] = useState(0);
	const [meal, setMeal] = useState('breakfast');
	const [day, setDay] = useState('Mon');
	const [common, setCommon] = useState(()=>({ breakfast:[], lunch:[], snacks:[], dinner:[] }));

	// hydrate common from items appearing every day of a week
	useEffect(()=>{
		const w = weeks[weekIndex];
		if (!w) return;
		const nextCommon = {};
		MEALS.forEach(m=>{
			const allLists = w.days.map(d=>d.meals[m]);
			const intersection = allLists.reduce((acc,list)=> acc.filter(x=>list.includes(x)) , [...(allLists[0]||[])]);
			nextCommon[m] = intersection;
		});
		setCommon(nextCommon);
	},[weeks, weekIndex]);

	const emit = useCallback((nextWeeks)=>{
		setWeeks(nextWeeks);
		onChange && onChange({ weeks: nextWeeks });
	},[onChange]);

	function addItem(item) {
		if (!item) return;
		emit(weeks.map((w,i)=> i!==weekIndex? w: { ...w, days: w.days.map(d=> d.day!==day? d: { ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], item].filter((v,i,a)=>a.indexOf(v)===i) } }) }));
	}
	function removeItem(item) {
		emit(weeks.map((w,i)=> i!==weekIndex? w: { ...w, days: w.days.map(d=> d.day!==day? d: { ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter(x=>x!==item) } }) }));
	}
	function addCommon(item){
		if(!item) return;
		const w = weeks[weekIndex];
		const updatedWeek = { ...w, days: w.days.map(d=> ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], item].filter((v,i,a)=>a.indexOf(v)===i) } })) };
		emit(weeks.map((w,i)=> i===weekIndex? updatedWeek: w));
	}
	function removeCommon(item){
		const w = weeks[weekIndex];
		const updatedWeek = { ...w, days: w.days.map(d=> ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter(x=>x!==item) } })) };
		emit(weeks.map((w,i)=> i===weekIndex? updatedWeek: w));
	}

	const currentWeek = weeks[weekIndex];
	const currentDay = currentWeek.days.find(d=>d.day===day);
	const items = currentDay.meals[meal];
	const commonItems = common[meal];

	const [text,setText] = useState('');
	const [commonText,setCommonText] = useState('');

	return (
		<div className="adv-menu-editor">
			<div className="toolbar-row">
				<div className="segmented">
					{weeks.map((w,i)=> <button key={i} className={i===weekIndex? 'active':''} onClick={()=>setWeekIndex(i)}>W{i+1}</button>)}
					<button onClick={()=> emit([...weeks, initStructure([])[0]])}>+ Week</button>
				</div>
				<div className="segmented">
					{MEALS.map(m=> <button key={m} className={m===meal? 'active':''} onClick={()=>setMeal(m)}>{m}</button>)}
				</div>
				<div className="segmented days">
					{currentWeek.days.map(d=> <button key={d.day} className={d.day===day? 'active':''} onClick={()=>setDay(d.day)}>{d.day}</button>)}
				</div>
			</div>
			<div className="editor-columns">
				<div>
					<h4>Day Items</h4>
					<div className="chips-box">
						{items.map(it=> <span key={it} className="chip" onClick={()=>removeItem(it)}>{it} ✕</span>)}
					</div>
					<form onSubmit={e=>{e.preventDefault(); addItem(text.trim()); setText('');}} className="add-form">
						<input value={text} onChange={e=>setText(e.target.value)} placeholder="Add item" />
						<button type="submit">Add</button>
					</form>
				</div>
				<div>
					<h4>Common (All Days - toggle by meal)</h4>
					<div className="chips-box">
						{commonItems.map(it=> <span key={it} className="chip common" onClick={()=>removeCommon(it)}>{it} ✕</span>)}
					</div>
					<form onSubmit={e=>{e.preventDefault(); addCommon(commonText.trim()); setCommonText('');}} className="add-form">
						<input value={commonText} onChange={e=>setCommonText(e.target.value)} placeholder="Add common" />
						<button type="submit">Add</button>
					</form>
				</div>
			</div>
		</div>
	);
}
