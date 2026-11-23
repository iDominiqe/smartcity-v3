/**
 * Background Web Worker for off-main-thread Smart City telemetry computation (v3).
 * Generates coherent live solar, microgrid, Na-ion storage, weather, and hardware metrics
 * without blocking the 3D WebGL render thread.
 */

let tick = 0;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function computePacket() {
  tick++;
  const phase = tick * 0.28;

  const productionKw = round2(442 + Math.sin(phase) * 16 + Math.cos(phase * 0.45) * 8);
  const consumptionKw = round2(216 + Math.sin(phase * 0.7 + 0.8) * 11 + Math.cos(phase * 0.3) * 5);
  const gridStatusPct = Math.round(86 + Math.sin(phase * 0.35) * 3);

  const efficiencyPct = round1(94.8 + Math.sin(phase * 0.4) * 0.6);
  const efficiencyDelta = round1(2.2 + Math.cos(phase * 0.25) * 0.3);

  const dailyMwh = round1(28.6 + Math.sin(phase * 0.2) * 0.4);
  const exportedKw = round1(87.4 + Math.sin(phase * 0.5) * 4.2);
  const importedKw = round1(9.9 + Math.cos(phase * 0.55) * 1.4);

  const batteryPct = Math.round(84 + Math.sin(phase * 0.32) * 5);
  const batteryKwh = Math.round((batteryPct / 100) * 100);
  const batteryHours = Math.round(batteryKwh / 4.2);

  const gridFreqHz = (50.0 + Math.sin(phase * 0.75) * 0.02).toFixed(2);
  const autonomyPct = round1(96.4 + Math.sin(phase * 0.22) * 0.4);

  const panelEffPct = Math.round(94 + Math.sin(phase * 0.3) * 1.4);
  const panelPerfPct = Math.round(88 + Math.cos(phase * 0.35) * 1.6);
  const inverterEffPct = Math.round(96 + Math.sin(phase * 0.28) * 1.1);
  const inverterLoadPct = Math.round(82 + Math.cos(phase * 0.42) * 3.5);

  const irradiance = round1(5.8 + Math.sin(phase * 0.18) * 0.3);
  const cloudCoverPct = Math.max(4, Math.round(8 + Math.cos(phase * 0.2) * 3));
  const windMs = round1(5.8 + Math.sin(phase * 0.4) * 0.7);
  const uvIndex = Math.round(6 + Math.sin(phase * 0.15) * 0.8);

  const annualEur = Math.round(34578 + Math.sin(phase * 0.15) * 180);
  const co2Tonnes = round2(14.8 + Math.sin(phase * 0.2) * 0.25);

  self.postMessage({
    productionKw,
    consumptionKw,
    gridStatusPct,
    efficiencyPct,
    efficiencyDelta,
    dailyMwh,
    exportedKw,
    importedKw,
    batteryKwh,
    batteryPct,
    batteryHours,
    gridFreqHz,
    autonomyPct,
    panelEffPct,
    panelPerfPct,
    inverterEffPct,
    inverterLoadPct,
    irradiance,
    cloudCoverPct,
    windMs,
    uvIndex,
    co2Tonnes,
    annualEur
  });
}

computePacket();
setInterval(computePacket, 1500);
