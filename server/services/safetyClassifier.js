/**
 * WHO/BIS Water Quality Safety Classifier
 * Classifies water as safe, warning, or unsafe based on sensor readings
 */

const THRESHOLDS = {
  ph: {
    safe: { min: 6.0, max: 8.0 },
    warning: { min: 6.0, max: 8.0 }, // inclusive boundary
  },
  turbidity: {
    // NTU (Nephelometric Turbidity Units)
    safe: { max: 1 },
    warning: { max: 4 },
  },
  temperature: {
    // Celsius
    safe: { min: 10, max: 25 },
    warning: { min: 5, max: 30 },
  },
};

/**
 * Classify a single sensor reading
 * @param {Object} reading - { ph, turbidity, temperature }
 * @returns {Object} { status, flags, alertDefs }
 */
const classify = ({ ph, turbidity, temperature }) => {
  const flags = [];
  const alertDefs = []; // Array of alert definitions to be created
  let overallStatus = 'safe';

  // --- pH Check ---
  if (ph < THRESHOLDS.ph.warning.min || ph > THRESHOLDS.ph.warning.max) {
    flags.push(ph < 6.0 ? 'low_ph' : 'high_ph');
    alertDefs.push({
      type: 'critical',
      parameter: 'ph',
      value: ph,
      threshold: ph < 6.0 ? THRESHOLDS.ph.warning.min : THRESHOLDS.ph.warning.max,
      message: `Critical pH level detected: ${ph.toFixed(2)} (Safe range: 6.0–8.0)`,
    });
    overallStatus = 'unsafe';
  } else if (ph < THRESHOLDS.ph.safe.min || ph > THRESHOLDS.ph.safe.max) {
    flags.push(ph < 6.5 ? 'low_ph_warning' : 'high_ph_warning');
    alertDefs.push({
      type: 'warning',
      parameter: 'ph',
      value: ph,
      threshold: ph < 6.5 ? THRESHOLDS.ph.safe.min : THRESHOLDS.ph.safe.max,
      message: `pH level approaching unsafe range: ${ph.toFixed(2)} (Safe range: 6.0–8.0)`,
    });
    if (overallStatus === 'safe') overallStatus = 'warning';
  }

  // --- Turbidity Check ---
  // (Ignoring status checks and alerts for turbidity, displaying value only)

  // --- Temperature Check ---
  // (Ignoring status checks and alerts for temperature, displaying value only)

  return { status: overallStatus, flags, alertDefs };
};

module.exports = { classify, THRESHOLDS };
