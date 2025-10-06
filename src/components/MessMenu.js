import React from 'react';

const titleMap = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

function annotate(line) {
  if (!line) return '';
  // Split by comma and wrap tokens containing Non-Veg / Veg markers
  return line.split(/,(?![^()]*\))/).map(seg => {
    const trimmed = seg.trim();
    if (/non\s*-?veg|chicken|egg|mutton|fish|biryani/i.test(trimmed)) {
      return `<span class="nv">${trimmed}</span>`;
    }
    if (/(veg[:]?|paneer|dal|idly|dosa|paratha|rice|curd|chutney|sambar)/i.test(trimmed)) {
      return `<span class="vg">${trimmed}</span>`;
    }
    return trimmed;
  }).join(', ');
}

const MessMenu = ({ menu, cycleMeta }) => {
  const normalized = menu || {};

  return (
    <div className="mess-menu">
      <h2>Mess Menu {cycleMeta && cycleMeta.weekType && (
        <span style={{fontSize:'0.7rem', marginLeft:8, opacity:0.6}}>
          {cycleMeta.weekType === 'week13' ? 'Week 1&3' : 'Week 2&4'}
        </span>
      )}</h2>

      {Object.keys(titleMap).map((key) => (
        <div key={key} className="meal-section">
          <h3 className="meal-title">{titleMap[key]}</h3>
          <p className="meal-items" dangerouslySetInnerHTML={{ __html: annotate(normalized[key]) || '—' }} />
        </div>
      ))}
      <div className="legend">
        <span className="legend-item"><span className="box veg"></span>Veg</span>
        <span className="legend-item"><span className="box nonveg"></span>Non-Veg</span>
      </div>
    </div>
  );
};

export default MessMenu;
