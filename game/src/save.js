// Save games live in localStorage: cash, story progress, shells found and
// the best cash ever held. Saving happens after every mission, pickup and
// bust, so closing the tab never loses Port Solenne.
import { BEST_KEY, SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data?.cash !== 'number' || typeof data?.mission !== 'number') return null;
    return data;
  } catch { return null; }
}

export function storeSave(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, mission: state.missionIndex, shells: state.shellsFound,
      done: state.storyDone === true,
    }));
    const best = Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    if (state.cash > best) window.localStorage.setItem(BEST_KEY, String(state.cash));
  } catch { /* private windows: the run lasts this visit only */ }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* nothing to clear */ }
}

export function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}
