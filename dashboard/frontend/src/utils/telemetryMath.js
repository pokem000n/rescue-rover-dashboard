/**
 * UIU Rescue Rover Team (#URRT) - Telemetry Physics & Analysis Utilities
 */

/**
 * Calculates Heat Index (Apparent Temperature) in Celsius
 * Using standard NOAA Rothfusz regression equation
 */
export function calculateHeatIndex(temperatureC, humidity) {
  if (temperatureC === null || humidity === null || isNaN(temperatureC) || isNaN(humidity)) {
    return null;
  }

  // Convert to Fahrenheit for NOAA formula
  const T = (temperatureC * 9 / 5) + 32;
  const RH = humidity;

  // Simple formula if temp is low
  if (T < 80) {
    const simpleHI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (RH * 0.094));
    return Number(((simpleHI - 32) * 5 / 9).toFixed(1));
  }

  // Full Rothfusz regression
  let hi = -42.379 +
    2.04901523 * T +
    10.14333127 * RH -
    0.22475541 * T * RH -
    0.00683783 * T * T -
    0.05481717 * RH * RH +
    0.00122874 * T * T * RH +
    0.00085282 * T * RH * RH -
    0.00000199 * T * T * RH * RH;

  // Adjustments
  if (RH < 13 && T >= 80 && T <= 112) {
    hi -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (RH > 85 && T >= 80 && T <= 87) {
    hi += ((RH - 85) / 10) * ((87 - T) / 5);
  }

  const hiCelsius = (hi - 32) * 5 / 9;
  return Number(hiCelsius.toFixed(1));
}

/**
 * Calculates Dew Point in Celsius using Magnus-Tetens formula
 */
export function calculateDewPoint(temperatureC, humidity) {
  if (temperatureC === null || humidity === null || isNaN(temperatureC) || isNaN(humidity)) {
    return null;
  }
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temperatureC) / (b + temperatureC)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return Number(dewPoint.toFixed(1));
}

/**
 * Assesses Environmental Threat Level for Rescue Rover Mission
 */
export function getThreatLevel(temperatureC, humidity) {
  if (temperatureC === null || humidity === null) {
    return { level: 'NOMINAL', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', desc: 'Telemetry baseline' };
  }

  if (temperatureC >= 42 || humidity >= 88) {
    return { level: 'CRITICAL HAZARD', color: 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse', desc: 'Extreme Heat/Vapor Stress' };
  }
  if (temperatureC >= 34 || humidity >= 75) {
    return { level: 'CAUTION', color: 'text-amber-400 bg-amber-500/15 border-amber-500/40', desc: 'Elevated Thermal Load' };
  }
  return { level: 'OPTIMAL / SAFE', color: 'text-[#00c2cb] bg-[#00c2cb]/10 border-[#00c2cb]/30', desc: 'Safe Operational Zone' };
}

/**
 * Generates and downloads a formatted CSV file of the mission telemetry session
 */
export function exportTelemetryToCSV(history = []) {
  if (!history || history.length === 0) {
    alert('No telemetry data collected in current session yet.');
    return;
  }

  const headers = [
    'Index',
    'Timestamp (ms)',
    'Date Time (ISO)',
    'Temperature (°C)',
    'Relative Humidity (%)',
    'Heat Index (°C)',
    'Dew Point (°C)'
  ];

  const rows = history.map((item, idx) => {
    const d = new Date(item.timestamp || Date.now());
    const hi = calculateHeatIndex(item.temperature, item.humidity);
    const dp = calculateDewPoint(item.temperature, item.humidity);
    return [
      idx + 1,
      item.timestamp,
      d.toISOString(),
      item.temperature ?? '',
      item.humidity ?? '',
      hi ?? '',
      dp ?? ''
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `URRT_Mission_Telemetry_${timestampStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
