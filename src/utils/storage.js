const KEY = 'campusData_v1';

export function loadData() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return {};
		return JSON.parse(raw) || {};
	} catch (e) {
		console.warn('Failed to parse stored data', e);
		return {};
	}
}

export function saveData(partial) {
	try {
		const prev = loadData();
		const merged = { ...prev, ...partial };
		localStorage.setItem(KEY, JSON.stringify(merged));
		return true;
	} catch (e) {
		console.error('Failed to save data', e);
		return false;
	}
}

export function clearData() { localStorage.removeItem(KEY); }
