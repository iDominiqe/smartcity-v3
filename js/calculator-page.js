import { I18nManager } from './i18n.js';
import { WasmProjectionKernel } from './wasm/projection-kernel.js';

async function initCalculatorsPage() {
  const i18n = new I18nManager('en');
  i18n.applyToDOM();

  const wasmKernel = new WasmProjectionKernel();
  await wasmKernel.init();

  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = i18n.lang;

  const badge = document.getElementById('calc-wasm-badge');
  if (badge) {
    badge.textContent = wasmKernel.isNativeWasm ? 'WASM Math Kernel Active' : 'JS Math Fallback';
  }

  function applyTheme(theme) {
    localStorage.setItem('neo_v3_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-btn]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-theme-btn') === theme);
    });
  }

  applyTheme(localStorage.getItem('neo_v3_theme') || 'light');
  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.getAttribute('data-theme-btn')));
  });
  langSelect?.addEventListener('change', (e) => i18n.setLanguage(e.target.value));

  // 1. Municipal Solar & Smart LED ROI
  const mRoof = document.getElementById('m-roof');
  const mPoles = document.getElementById('m-poles');
  const mSun = document.getElementById('m-sun');
  function updateMunicipal() {
    const roof = Number(mRoof.value);
    const poles = Number(mPoles.value);
    const sun = Number(mSun.value);
    document.getElementById('bar-m-roof').style.width = `${((roof - 40) / 760) * 100}%`;
    document.getElementById('bar-m-poles').style.width = `${(poles / 150) * 100}%`;
    document.getElementById('val-m-roof').textContent = `${roof} m²`;
    document.getElementById('val-m-poles').textContent = `${poles}`;

    const totalKwh = wasmKernel.calcSolarYield(roof, poles, sun);
    const savings = Math.round(totalKwh * 0.24);
    const co2 = ((totalKwh * 0.38) / 1000).toFixed(1);
    document.getElementById('out-m-kwh').textContent = `${totalKwh.toLocaleString()} kWh`;
    document.getElementById('out-m-eur').textContent = `€${savings.toLocaleString()}`;
    document.getElementById('out-m-co2').textContent = `${co2} t`;
  }
  [mRoof, mPoles, mSun].forEach((el) => el?.addEventListener('input', updateMunicipal));
  updateMunicipal();

  // 2. Campsite Electrical Simultaneity
  const sUnits = document.getElementById('s-units');
  const sFactor = document.getElementById('s-factor');
  const sGrid = document.getElementById('s-grid');
  function updateSimultaneity() {
    const units = Number(sUnits.value);
    const factor = Number(sFactor.value) / 100;
    const gridKva = Number(sGrid.value);
    document.getElementById('bar-s-units').style.width = `${((units - 10) / 290) * 100}%`;
    document.getElementById('bar-s-factor').style.width = `${((Number(sFactor.value) - 30) / 70) * 100}%`;
    document.getElementById('val-s-units').textContent = `${units}`;
    document.getElementById('val-s-factor').textContent = `${Math.round(factor * 100)}%`;

    const peakKw = Math.round(units * 0.95 * factor);
    const bufferKwh = Math.max(0, Math.round((peakKw - gridKva) * 2.5));
    document.getElementById('out-s-peak').textContent = `${peakKw} kW`;
    document.getElementById('out-s-buffer').textContent = `${bufferKwh} kWh`;
    document.getElementById('out-s-status').textContent = peakKw <= gridKva ? 'Grid OK' : 'Buffer Needed';
  }
  [sUnits, sFactor, sGrid].forEach((el) => el?.addEventListener('input', updateSimultaneity));
  updateSimultaneity();

  // 3. Season 2027 Campsite AC Rental
  const rUnits = document.getElementById('r-units');
  const rWeeks = document.getElementById('r-weeks');
  const rRate = document.getElementById('r-rate');
  function updateRental() {
    const units = Number(rUnits.value);
    const weeks = Number(rWeeks.value);
    const rate = Number(rRate.value);
    document.getElementById('bar-r-units').style.width = `${((units - 5) / 145) * 100}%`;
    document.getElementById('bar-r-weeks').style.width = `${((weeks - 8) / 20) * 100}%`;
    document.getElementById('val-r-units').textContent = `${units}`;
    document.getElementById('val-r-weeks').textContent = `${weeks} wks`;

    const gross = units * weeks * rate;
    const margin = Math.round(gross * 0.4);
    document.getElementById('out-r-gross').textContent = `€${gross.toLocaleString()}`;
    document.getElementById('out-r-margin').textContent = `€${margin.toLocaleString()}`;
  }
  [rUnits, rWeeks, rRate].forEach((el) => el?.addEventListener('input', updateRental));
  updateRental();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculatorsPage);
} else {
  initCalculatorsPage();
}
