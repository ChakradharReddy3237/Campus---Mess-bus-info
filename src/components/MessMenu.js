import React, { useState, useMemo } from 'react';

export default function MessMenu({ data }) {
	const weeks = data?.weeks || [];
	const [weekIndex,setWeekIndex] = useState(0);
	const [day,setDay] = useState('Mon');

	const week = weeks[weekIndex];
	const dayObj = week?.days?.find(d=>d.day===day);

	const meals = dayObj?.meals || {};

	const dayButtons = week?.days?.map(d=> <button key={d.day} className={d.day===day? 'active':''} onClick={()=>setDay(d.day)}>{d.day}</button>) || null;

	const mealSections = useMemo(()=> Object.entries(meals).map(([meal,items])=> (
		<div key={meal} className="meal-card">
			<h4>{meal}</h4>
			{items.length? <ul>{items.map(i=> <li key={i}>{i}</li>)}</ul>: <p className="empty">No items</p> }
		</div>
	)), [meals]);

	if(!weeks.length) return <div className="panel"><p>No menu data.</p></div>;

	return (
		<div className="panel">
			<div className="panel-header">
				<h3>Mess Menu</h3>
				<div className="segmented-inline">
					{weeks.map((w,i)=> <button key={i} className={i===weekIndex? 'active':''} onClick={()=>setWeekIndex(i)}>W{i+1}</button>)}
				</div>
			</div>
			<div className="segmented-inline days">
				{dayButtons}
			</div>
			<div className="meal-grid">
				{mealSections}
			</div>
		</div>
	);
}
