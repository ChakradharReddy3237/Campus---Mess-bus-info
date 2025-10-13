import React from 'react';

const FullScheduleModal = ({ schedule, categoryName, onClose }) => {
  if (!schedule) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Bus Schedule</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p>No schedule data available for today.</p>
        </div>
      </div>
    );
  }

  const { routes, specials } = schedule;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{categoryName} Bus Schedule</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        
        <div className="full-schedule-content">
          {Object.entries(routes).map(([routeName, times]) => (
            <div key={routeName} className="schedule-section">
              <h4>{routeName}</h4>
              <div className="time-slots-grid">
                {times.map((time, index) => (
                  <span key={index} className="time-item">{time}</span>
                ))}
              </div>
            </div>
          ))}

          {specials && (specials.palakkadTown?.length > 0 || specials.wisePark?.length > 0) && (
            <div className="schedule-section">
              <h4>Special Routes</h4>
              {specials.palakkadTown?.length > 0 && (
                <div className="special-block">
                  <h5>Palakkad Town</h5>
                  <ul>
                    {specials.palakkadTown.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {specials.wisePark?.length > 0 && (
                <div className="special-block">
                  <h5>Wise Park Junction</h5>
                  <ul>
                    {specials.wisePark.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default FullScheduleModal;
