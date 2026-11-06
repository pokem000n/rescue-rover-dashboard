/**
 * UIU Rescue Rover Team (#URRT) - Configurable Alert Thresholds Manager
 * Persists customizable environmental setpoints to localStorage.
 */

export const DEFAULT_THRESHOLDS = {
  tempWarning: 35,      // °C
  tempDanger: 40,       // °C (triggers audible hazard siren)
  tempMinWarning: 15,   // °C
  humidityDanger: 80    // % RH (triggers condensation warning)
};

const STORAGE_KEY = 'urrt_hazard_thresholds';

export function loadThresholds() {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_THRESHOLDS };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        tempWarning: Number(parsed.tempWarning) || DEFAULT_THRESHOLDS.tempWarning,
        tempDanger: Number(parsed.tempDanger) || DEFAULT_THRESHOLDS.tempDanger,
        tempMinWarning: Number(parsed.tempMinWarning) || DEFAULT_THRESHOLDS.tempMinWarning,
        humidityDanger: Number(parsed.humidityDanger) || DEFAULT_THRESHOLDS.humidityDanger
      };
    }
  } catch (e) {
    console.warn('[Thresholds] Failed to load from localStorage:', e);
  }
  return { ...DEFAULT_THRESHOLDS };
}

export function saveThresholds(thresholds) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
    }
  } catch (e) {
    console.warn('[Thresholds] Failed to save to localStorage:', e);
  }
}
