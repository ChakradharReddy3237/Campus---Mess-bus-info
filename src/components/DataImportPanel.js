import React, { useMemo, useState } from 'react';
import { parseAllFromText } from '../utils/parser';

const DataImportPanel = ({ onClose, onSave, initialText = '', currentData }) => {
  const [rawText, setRawText] = useState(initialText);
  const [error, setError] = useState('');

  const parsedPreview = useMemo(() => {
    try {
      return parseAllFromText(rawText, currentData);
    } catch (e) {
      return null;
    }
  }, [rawText, currentData]);

  const handleSave = () => {
    try {
      const data = parseAllFromText(rawText, currentData);
      onSave(data);
    } catch (err) {
      setError('Could not parse the provided text. Please check the format.');
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Update Data</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="help-text">
          <p>Copy and paste your menu and bus schedule data in this format:</p>
          <div className="format-example">
            <strong>Breakfast:</strong> Idly, Vada, Sambar, Coconut Chutney<br/>
            <strong>Lunch:</strong> Rice, Dal, Vegetable Curry, Sambar<br/>
            <strong>Snacks:</strong> Tea, Biscuits<br/>
            <strong>Dinner:</strong> Chapati, Paneer Curry, Rice<br/>
            <br/>
            <strong>Buses:</strong><br/>
            Nila → Sahyadri: 9:00 PM, 10:00 PM, 11:00 PM<br/>
            Sahyadri → Nila: 9:15 PM, 10:15 PM, 7:30 AM
          </div>
        </div>

        <label className="field-label">Paste menu and bus schedule data:</label>
        <textarea
          className="text-input"
          rows={12}
          placeholder="Breakfast: Idly, Vada, Sambar...&#10;Lunch: Rice, Dal...&#10;Snacks: Tea, Biscuits...&#10;Dinner: Chapati, Curry...&#10;&#10;Buses:&#10;Nila → Sahyadri: 9:00 PM, 10:00 PM&#10;Sahyadri → Nila: 9:15 PM, 10:15 PM"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        {error && <div className="error-text">{error}</div>}

        <div className="preview">
          <h4>Preview</h4>
          <pre className="preview-json">{JSON.stringify(parsedPreview || currentData, null, 2)}</pre>
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default DataImportPanel;
