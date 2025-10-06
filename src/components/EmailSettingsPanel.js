import React, { useState } from 'react';
import { loadEmailSettings, saveEmailSettings } from '../utils/storage';

const EmailSettingsPanel = ({ onClose, onSave }) => {
  const [settings, setSettings] = useState(() => loadEmailSettings() || {
    enabled: false,
    provider: 'gmail',
    senderEmail: '',
    refreshInterval: 30,
    lastCheck: null
  });

  const handleSave = () => {
    saveEmailSettings(settings);
    onSave(settings);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Email Integration Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="settings-form">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
            />
            Enable automatic email updates
          </label>

          {settings.enabled && (
            <>
              <label className="field-label">Email Provider:</label>
              <select 
                className="select-input"
                value={settings.provider}
                onChange={(e) => setSettings({...settings, provider: e.target.value})}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="imap">Custom IMAP</option>
              </select>

              <label className="field-label">Sender Email Address:</label>
              <input
                type="email"
                className="text-input"
                placeholder="admin@college.edu"
                value={settings.senderEmail}
                onChange={(e) => setSettings({...settings, senderEmail: e.target.value})}
              />

              <label className="field-label">Check for new emails every (minutes):</label>
              <input
                type="number"
                className="text-input"
                min="5"
                max="1440"
                value={settings.refreshInterval}
                onChange={(e) => setSettings({...settings, refreshInterval: parseInt(e.target.value)})}
              />

              <div className="info-box">
                <p><strong>Note:</strong> For Gmail/Outlook, you'll need to authorize this app to read your emails. We'll only read emails from the specified sender address.</p>
                <p>The app will look for emails containing menu and bus schedule information and automatically update the dashboard.</p>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default EmailSettingsPanel;
