import React, { useState, useEffect, useMemo } from 'react';

function parseTime(str){
	const [h,m] = str.split(':').map(Number);
	return h*60 + m;
}
function formatCountdown(mins){
	if(mins<=0) return 'now';
	const h = Math.floor(mins/60); const m = mins%60;
	return h? `${h}h ${m}m` : `${m}m`;
}

export default function CampusBus({ data }) {
	const categories = Object.keys(data?.categories||{});
	const [cat,setCat] = useState(categories[0]||'');
	const [direction,setDirection] = useState('toCampus');
	const [hidePast,setHidePast] = useState(true);
	const [now,setNow] = useState(()=> new Date());
	useEffect(()=>{ const id=setInterval(()=> setNow(new Date()), 60*1000); return ()=>clearInterval(id); },[]);

	useEffect(()=>{ if(!categories.includes(cat) && categories[0]) setCat(categories[0]); },[categories,cat]);

	const minutesNow = now.getHours()*60 + now.getMinutes();

	const times = data?.categories?.[cat]?.[direction] || [];
	const futureTimes = times.filter(t=> !hidePast || parseTime(t) >= minutesNow);
	const nextTime = times.find(t=> parseTime(t) >= minutesNow);
	const countdown = nextTime? formatCountdown(parseTime(nextTime)-minutesNow) : null;

	const specials = data?.specials || [];
	const specialList = useMemo(()=> specials.slice().sort((a,b)=> parseTime(a.time)-parseTime(b.time)),[specials]);

	if(!categories.length) return <div className="panel"><p>No bus data.</p></div>;

	return (
		<div className="panel">
			<div className="panel-header">
				<h3>Campus Buses</h3>
				<div className="segmented-inline">
					{categories.map(c=> <button key={c} className={c===cat? 'active':''} onClick={()=>setCat(c)}>{c}</button>)}
				</div>
			</div>
			<div className="segmented-inline">
				{['toCampus','fromCampus'].map(d=> <button key={d} className={d===direction? 'active':''} onClick={()=>setDirection(d)}>{d}</button>)}
				<label className="toggle"><input type="checkbox" checked={hidePast} onChange={e=>setHidePast(e.target.checked)} /> hide past</label>
			</div>
			<div className="times-row">
				{futureTimes.map(t=> <span key={t} className={t===nextTime? 'next bus-chip':'bus-chip'}>{t}</span>)}
			</div>
			<div className="countdown">{countdown && <span>Next: {nextTime} ({countdown})</span>}</div>
			{specialList.length>0 && <div className="specials">
				<h4>Specials</h4>
				<ul>{specialList.map((s,i)=> <li key={i}>{s.time} {s.label}</li>)}</ul>
			</div>}
		</div>
	);
}
