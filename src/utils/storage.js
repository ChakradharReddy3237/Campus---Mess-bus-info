const STORAGE_KEY = 'campus-dashboard:data:v1';
const EMAIL_SETTINGS_KEY = 'campus-dashboard:email-settings:v1';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function loadEmailSettings() {
  try {
    const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveEmailSettings(settings) {
  try {
    localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
