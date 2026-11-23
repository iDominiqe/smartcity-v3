import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { I18nManager } from './i18n.js';
import { GPUPreloader } from './gpu-preloader.js';
import { WasmProjectionKernel } from './wasm/projection-kernel.js';
import {
  renderDotMatrixChart,
  renderPowerBarsChart,
  renderDonutRing,
  renderDialGauge,
  renderSunlightArc
} from './charts.js';
import {
  createStagedCityBuilder,
  SECTOR_VIEWS,
  SECTOR_ANCHORS
} from './city-scene.js';

const WEEKDAY_PROFILES = [
  { temp: '19°C', condKey: 'weatherBreeze', irr: '5.1 kWh/m²', cloud: '14%', wind: '6.4 m/s', uv: '5', progress: 0.48, hrs: '6.1 hr', range: '06:12 – 18:18', eff: [1, 2, 3, 2, 4, 5, 6, 5, 7, 6, 8, 7, 5, 7, 6, 4, 5, 4, 3, 2, 3, 2, 1, 1] },
  { temp: '20°C', condKey: 'weatherClear', irr: '5.5 kWh/m²', cloud: '10%', wind: '5.2 m/s', uv: '6', progress: 0.54, hrs: '6.5 hr', range: '06:10 – 18:19', eff: [2, 2, 3, 4, 3, 5, 7, 6, 8, 7, 8, 9, 7, 8, 6, 7, 6, 5, 4, 4, 3, 2, 1, 2] },
  { temp: '22°C', condKey: 'weatherSunny', irr: '6.1 kWh/m²', cloud: '5%', wind: '4.1 m/s', uv: '7', progress: 0.68, hrs: '7.4 hr', range: '06:09 – 18:20', eff: [2, 3, 3, 5, 4, 6, 8, 7, 9, 8, 9, 8, 9, 8, 7, 8, 7, 6, 5, 4, 3, 2, 2, 1] },
  { temp: '21°C', condKey: 'weatherClear', irr: '5.8 kWh/m²', cloud: '8%', wind: '5.8 m/s', uv: '6', progress: 0.62, hrs: '6.8 hr', range: '06:08 – 18:21', eff: [2, 3, 2, 4, 5, 4, 6, 7, 6, 8, 9, 7, 8, 9, 8, 6, 7, 6, 5, 4, 3, 2, 2, 1] },
  { temp: '19°C', condKey: 'weatherBreeze', irr: '4.9 kWh/m²', cloud: '18%', wind: '6.9 m/s', uv: '5', progress: 0.44, hrs: '5.9 hr', range: '06:07 – 18:22', eff: [1, 2, 2, 3, 4, 3, 5, 6, 5, 7, 6, 7, 6, 5, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1] },
  { temp: '23°C', condKey: 'weatherSunny', irr: '6.4 kWh/m²', cloud: '4%', wind: '3.8 m/s', uv: '7', progress: 0.76, hrs: '8.1 hr', range: '06:06 – 18:24', eff: [2, 3, 4, 5, 6, 5, 7, 8, 9, 8, 9, 9, 8, 9, 9, 8, 7, 7, 6, 5, 4, 3, 2, 2] },
  { temp: '22°C', condKey: 'weatherClear', irr: '5.9 kWh/m²', cloud: '9%', wind: '4.6 m/s', uv: '6', progress: 0.60, hrs: '7.0 hr', range: '06:05 – 18:25', eff: [2, 2, 3, 4, 5, 4, 6, 7, 7, 8, 7, 9, 8, 8, 7, 6, 7, 5, 5, 4, 3, 2, 2, 1] }
];

const TIMEFRAME_SCALES = {
  live: { prodUnit: 'kW', mult: 1, consMult: 1, mwh: 28.6 },
  day: { prodUnit: 'MWh', mult: 0.011, consMult: 0.01, mwh: 28.6 },
  week: { prodUnit: 'MWh', mult: 0.075, consMult: 0.07, mwh: 194.2 },
  month: { prodUnit: 'MWh', mult: 0.31, consMult: 0.29, mwh: 842.0 },
  year: { prodUnit: 'GWh', mult: 0.0038, consMult: 0.0035, mwh: 10.4 }
};

async function initApp() {
  const i18n = new I18nManager('en');
  i18n.applyToDOM();

  const wasmKernel = new WasmProjectionKernel();
  await wasmKernel.init();

  let currentTheme = localStorage.getItem('neo_v3_theme') || 'light';
  let currentQuality = localStorage.getItem('neo_v3_quality') || 'hd';
  let activeSector = 'overview';
  let activeTimeframe = 'live';
  let effChartMode = 'dots';
  let balChartMode = 'balance';
  let lightingIndex = 0;
  let activeWeekday = 3;
  let latestTelemetry = {
    productionKw: 442,
    consumptionKw: 216,
    gridStatusPct: 86,
    efficiencyPct: 94.8,
    efficiencyDelta: 2.2,
    dailyMwh: 28.6,
    exportedKw: 87.4,
    importedKw: 9.9,
    batteryKwh: 84,
    batteryPct: 84,
    batteryHours: 20,
    panelEffPct: 94,
    panelPerfPct: 88,
    inverterEffPct: 96,
    inverterLoadPct: 82,
    annualEur: 34578,
    co2Tonnes: 14.8
  };

  const lightingModes = ['day', 'sunset', 'night'];
  const lightingIcons = ['☀️', '🌇', '🌙'];

  const canvas = document.getElementById('city-canvas');
  const langSelect = document.getElementById('lang-select');
  const effChartSvg = document.getElementById('eff-chart-svg');
  const effTooltip = document.getElementById('eff-tooltip');
  const donutSvg = document.getElementById('donut-balance-svg');
  const dialSvg = document.getElementById('dial-gauge-svg');
  const sunArcSvg = document.getElementById('sunlight-arc-svg');
  const roiDrawer = document.getElementById('roi-drawer');
  const hudComputeBadge = document.getElementById('hud-compute-badge');
  const hudBuffers = document.getElementById('hud-gpu-buffers');
  const hudFps = document.getElementById('hud-fps');

  if (langSelect) langSelect.value = i18n.lang;
  if (hudComputeBadge) hudComputeBadge.textContent = wasmKernel.isNativeWasm ? 'WASM+GLSL' : 'JS+GLSL';

  // ---------------------------------------------------------------------------
  // 1. THEME, QUALITY & LANGUAGE CONTROLS
  // ---------------------------------------------------------------------------
  let cityCtrl = null;

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('neo_v3_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0D1116' : '#EDF1F5');

    document.querySelectorAll('[data-theme-btn]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-theme-btn') === theme);
    });
    cityCtrl?.applyThemeToScene(theme);
  }

  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.getAttribute('data-theme-btn')));
  });

  function applyQuality(quality) {
    currentQuality = quality;
    localStorage.setItem('neo_v3_quality', quality);
    document.documentElement.setAttribute('data-quality', quality);
    document.querySelectorAll('[data-quality-btn]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-quality-btn') === quality);
    });
    preloader.setProfileLabel(quality === 'hd' ? i18n.t('qualHd') : i18n.t('qualClay'));
    cityCtrl?.applyQualityMode(quality);
  }

  document.querySelectorAll('[data-quality-btn]').forEach((btn) => {
    btn.addEventListener('click', () => applyQuality(btn.getAttribute('data-quality-btn')));
  });

  langSelect?.addEventListener('change', (e) => {
    i18n.setLanguage(e.target.value);
    renderWeatherProfile(activeWeekday);
    refreshChartsAndMetrics();
  });

  // ---------------------------------------------------------------------------
  // 2. SEARCH DROPDOWN, ROI DRAWER & WEEKDAY SUNLIGHT PROFILE
  // ---------------------------------------------------------------------------
  const searchInput = document.getElementById('node-search-input');
  const searchDropdown = document.getElementById('node-search-dropdown');

  searchInput?.addEventListener('focus', () => searchDropdown?.classList.add('is-open'));
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    searchDropdown?.classList.add('is-open');
    searchDropdown?.querySelectorAll('.search-item').forEach((item) => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-pill-box')) {
      searchDropdown?.classList.remove('is-open');
    }
  });

  document.querySelectorAll('[data-search-sector]').forEach((btn) => {
    btn.addEventListener('click', () => {
      focusSector(btn.getAttribute('data-search-sector'));
      searchDropdown?.classList.remove('is-open');
    });
  });

  function toggleRoiDrawer(force) {
    const next = typeof force === 'boolean' ? force : !roiDrawer.classList.contains('is-open');
    roiDrawer?.classList.toggle('is-open', next);
  }
  document.getElementById('btn-toggle-roi')?.addEventListener('click', () => toggleRoiDrawer());
  document.getElementById('btn-open-roi-earning')?.addEventListener('click', () => toggleRoiDrawer(true));
  document.getElementById('btn-open-roi-co2')?.addEventListener('click', () => toggleRoiDrawer(true));
  document.getElementById('btn-close-roi')?.addEventListener('click', () => toggleRoiDrawer(false));

  const inputRoof = document.getElementById('input-roof');
  const inputPoles = document.getElementById('input-poles');
  const inputEv = document.getElementById('input-ev');

  function updateQuickRoi() {
    if (!inputRoof || !inputPoles || !inputEv) return;
    const roof = Number(inputRoof.value);
    const poles = Number(inputPoles.value);
    const ev = Number(inputEv.value);

    document.getElementById('bar-roof').style.width = `${((roof - 40) / 660) * 100}%`;
    document.getElementById('bar-poles').style.width = `${(poles / 140) * 100}%`;
    document.getElementById('bar-ev').style.width = `${(ev / 240) * 100}%`;
    document.getElementById('val-roof').textContent = `${roof} m²`;
    document.getElementById('val-poles').textContent = `${poles}`;
    document.getElementById('val-ev').textContent = `${ev} km`;

    const kwh = wasmKernel.calcSolarYield(roof, poles, 1320);
    const evBonus = Math.min(ev * 365 * 0.16, kwh * 0.35);
    const eur = Math.round((kwh + evBonus * 0.5) * 0.24);
    const co2 = ((kwh * 0.38) / 1000).toFixed(1);

    document.getElementById('out-roi-savings').textContent = `€${eur.toLocaleString()} / yr`;
    document.getElementById('out-roi-solar').textContent = `${kwh.toLocaleString()} kWh · ${co2} t CO₂`;
  }
  [inputRoof, inputPoles, inputEv].forEach((el) => el?.addEventListener('input', updateQuickRoi));
  updateQuickRoi();

  function renderWeatherProfile(dayIdx) {
    activeWeekday = dayIdx;
    const p = WEEKDAY_PROFILES[dayIdx] || WEEKDAY_PROFILES[3];
    document.querySelectorAll('.day-pill-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.getAttribute('data-weekday')) === dayIdx);
    });
    document.getElementById('weather-temp').textContent = p.temp;
    document.getElementById('weather-cond').textContent = i18n.t(p.condKey);
    document.getElementById('w-irradiance').textContent = p.irr;
    document.getElementById('w-cloud').textContent = p.cloud;
    document.getElementById('w-wind').textContent = p.wind;
    document.getElementById('w-uv').textContent = p.uv;
    document.getElementById('sunlight-range').textContent = p.range;

    renderSunlightArc(sunArcSvg, p.progress, p.hrs);
    cityCtrl?.setSunAngle(p.progress);
    if (effChartMode === 'dots') {
      renderDotMatrixChart(effChartSvg, effTooltip, p.eff);
    }
  }

  document.querySelectorAll('.day-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => renderWeatherProfile(Number(btn.getAttribute('data-weekday'))));
  });
  document.getElementById('btn-weather-sun-step')?.addEventListener('click', () => {
    renderWeatherProfile((activeWeekday + 1) % WEEKDAY_PROFILES.length);
  });

  // ---------------------------------------------------------------------------
  // 3. BENTO CHARTS & LIVE WORKER TELEMETRY
  // ---------------------------------------------------------------------------
  function refreshChartsAndMetrics() {
    const t = latestTelemetry;
    const tf = TIMEFRAME_SCALES[activeTimeframe] || TIMEFRAME_SCALES.live;

    const prodDisp = tf.prodUnit === 'kW'
      ? Math.round(t.productionKw)
      : (t.productionKw * tf.mult).toFixed(1);
    const consDisp = tf.prodUnit === 'kW'
      ? Math.round(t.consumptionKw)
      : (t.consumptionKw * tf.consMult).toFixed(1);

    document.getElementById('kpi-prod-val').innerHTML = `${prodDisp}<small>${tf.prodUnit}</small>`;
    document.getElementById('kpi-cons-val').innerHTML = `${consDisp}<small>${tf.prodUnit}</small>`;
    document.getElementById('kpi-grid-val').innerHTML = `${t.gridStatusPct}<small>%</small>`;
    document.getElementById('kpi-prod-bar').style.width = `${Math.min(96, (t.productionKw / 520) * 100)}%`;
    document.getElementById('kpi-cons-bar').style.width = `${Math.min(92, (t.consumptionKw / 400) * 100)}%`;
    document.getElementById('kpi-grid-bar').style.width = `${t.gridStatusPct}%`;

    document.getElementById('val-panel-eff').textContent = `${t.panelEffPct}%`;
    document.getElementById('bar-panel-eff').style.width = `${t.panelEffPct}%`;
    document.getElementById('val-panel-perf').textContent = `${t.panelPerfPct}%`;
    document.getElementById('bar-panel-perf').style.width = `${t.panelPerfPct}%`;
    document.getElementById('val-inv-eff').textContent = `${t.inverterEffPct}%`;
    document.getElementById('bar-inv-eff').style.width = `${t.inverterEffPct}%`;
    document.getElementById('val-inv-load').textContent = `${t.inverterLoadPct}%`;
    document.getElementById('bar-inv-load').style.width = `${t.inverterLoadPct}%`;

    document.getElementById('val-eff-pct').textContent = `${t.efficiencyPct}%`;
    document.getElementById('val-eff-delta').textContent = `↑ +${t.efficiencyDelta}%`;

    document.getElementById('val-earning').textContent = `€${t.annualEur.toLocaleString()}`;
    document.getElementById('val-co2-left').textContent = `${t.co2Tonnes} t`;

    document.getElementById('val-bat-kwh').textContent = `${t.batteryKwh} kWh`;
    document.getElementById('val-bat-rem').textContent = `${t.batteryHours}`;
    document.getElementById('bat-capsule-fill').style.width = `${t.batteryPct}%`;
    document.getElementById('bat-capsule-pct').textContent = `${t.batteryPct}%`;

    const prodMwh = t.dailyMwh;
    const consMwh = Number((prodMwh * 0.59).toFixed(1));
    const expMwh = Number((prodMwh * 0.30).toFixed(1));
    const impMwh = Number((t.importedKw * 0.1).toFixed(2));

    document.getElementById('donut-val').innerHTML = `${prodMwh}<small style="font-size:10px;font-weight:600;margin-left:1px;">MWh</small>`;
    document.getElementById('bal-prod-val').textContent = `${prodMwh} MWh`;
    document.getElementById('bal-cons-val').textContent = `${consMwh} MWh`;
    document.getElementById('bal-exp-val').textContent = `${expMwh} MWh`;
    document.getElementById('bal-imp-val').textContent = `${impMwh} MWh`;

    if (balChartMode === 'balance') {
      renderDonutRing(donutSvg, prodMwh / 35);
    } else {
      renderDialGauge(dialSvg, t.productionKw, 540);
    }
  }

  document.querySelectorAll('[data-timeframe]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTimeframe = btn.getAttribute('data-timeframe');
      document.querySelectorAll('[data-timeframe]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-timeframe') === activeTimeframe);
      });
      refreshChartsAndMetrics();
    });
  });

  document.querySelectorAll('[data-eff-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      effChartMode = btn.getAttribute('data-eff-mode');
      document.querySelectorAll('[data-eff-mode]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-eff-mode') === effChartMode);
      });
      if (effChartMode === 'dots') {
        renderDotMatrixChart(effChartSvg, effTooltip, WEEKDAY_PROFILES[activeWeekday].eff);
      } else {
        renderPowerBarsChart(effChartSvg, effTooltip);
      }
    });
  });

  document.querySelectorAll('[data-bal-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      balChartMode = btn.getAttribute('data-bal-mode');
      document.querySelectorAll('[data-bal-mode]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-bal-mode') === balChartMode);
      });
      const balView = document.getElementById('panel-balance-view');
      const dialView = document.getElementById('panel-dial-view');
      const titleEl = document.getElementById('card3-title');
      if (balChartMode === 'balance') {
        balView.hidden = false;
        dialView.hidden = true;
        titleEl.textContent = i18n.t('balTitle');
      } else {
        balView.hidden = true;
        dialView.hidden = false;
        titleEl.textContent = i18n.t('dialTitle');
      }
      refreshChartsAndMetrics();
    });
  });

  try {
    const worker = new Worker('./js/workers/telemetry-worker.js');
    worker.addEventListener('message', (e) => {
      if (e.data) {
        latestTelemetry = { ...latestTelemetry, ...e.data };
        refreshChartsAndMetrics();
      }
    });
  } catch (err) {
    console.warn('Worker telemetry skipped:', err);
  }

  // ---------------------------------------------------------------------------
  // 4. THREE.JS WEBGL INITIALIZATION & WASM SPATIAL PINS
  // ---------------------------------------------------------------------------
  let renderer = null;
  let scene = null;
  let camera = null;
  let controls = null;
  let camGoalPos = null;
  let camGoalTarget = null;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: currentTheme === 'eco' ? 'low-power' : 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (err) {
    console.warn('WebGL unavailable:', err);
  }

  const preloader = new GPUPreloader();

  function focusSector(sectorId) {
    activeSector = SECTOR_VIEWS[sectorId] ? sectorId : 'overview';
    const view = SECTOR_VIEWS[activeSector];

    document.querySelectorAll('[data-focus-sector]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-focus-sector') === activeSector);
    });

    if (camera && controls) {
      camGoalPos = view.pos.clone();
      camGoalTarget = view.target.clone();
      if (activeSector !== 'overview') {
        controls.autoRotate = false;
        document.getElementById('btn-auto-orbit')?.classList.remove('active');
      }
    }
  }

  document.querySelectorAll('[data-focus-sector]').forEach((btn) => {
    btn.addEventListener('click', () => focusSector(btn.getAttribute('data-focus-sector')));
  });

  document.getElementById('btn-auto-orbit')?.addEventListener('click', (e) => {
    if (!controls) return;
    controls.autoRotate = !controls.autoRotate;
    e.currentTarget.classList.toggle('active', controls.autoRotate);
  });

  document.getElementById('btn-cycle-lighting')?.addEventListener('click', () => {
    lightingIndex = (lightingIndex + 1) % lightingModes.length;
    document.getElementById('lighting-icon').textContent = lightingIcons[lightingIndex];
    cityCtrl?.applyLightingMode(lightingModes[lightingIndex]);
  });

  const vpMatrix = new THREE.Matrix4();
  const pinElements = {
    solar: document.getElementById('pin-solar'),
    ev: document.getElementById('pin-ev'),
    home: document.getElementById('pin-home'),
    hvac: document.getElementById('pin-hvac')
  };

  function updateSpatialPins() {
    if (!camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.updateMatrixWorld();
    vpMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const vpElems = vpMatrix.elements;

    Object.entries(SECTOR_ANCHORS).forEach(([key, anchor]) => {
      const el = pinElements[key];
      if (!el) return;
      const pt = wasmKernel.projectPoint(vpElems, anchor.x, anchor.y, anchor.z, w, h);
      const inLeftHud = pt.sx < 310 && pt.sy < 450;
      const inRightWeather = pt.sx > w - 370 && pt.sy < 405;
      const inSafeBand = pt.visible && pt.sy > 78 && pt.sy < h - 225 && !inLeftHud && !inRightWeather;
      el.style.opacity = inSafeBand ? '1' : '0';
      el.style.pointerEvents = inSafeBand ? 'auto' : 'none';
      if (inSafeBand) {
        el.style.left = `${pt.sx}px`;
        el.style.top = `${pt.sy}px`;
      }
    });
  }

  renderWeatherProfile(activeWeekday);
  refreshChartsAndMetrics();
  applyTheme(currentTheme);

  if (!renderer) {
    preloader.overlay?.classList.add('is-ready');
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    36,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.5,
    180
  );
  camera.position.copy(SECTOR_VIEWS.overview.pos);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;
  controls.minDistance = 7.5;
  controls.maxDistance = 38;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  controls.target.copy(SECTOR_VIEWS.overview.target);
  controls.addEventListener('start', () => {
    camGoalPos = null;
    camGoalTarget = null;
  });

  cityCtrl = createStagedCityBuilder(scene, renderer, {
    i18n,
    initialQuality: currentQuality,
    initialTheme: currentTheme
  });
  applyQuality(currentQuality);

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  preloader
    .run(cityCtrl.tasks, {
      renderer,
      scene,
      camera,
      doneLabel: i18n.t('preStepDone')
    })
    .then((geoCount) => {
      if (hudBuffers) hudBuffers.textContent = String(geoCount);
    });

  let lastNow = performance.now();
  let frames = 0;
  let fpsTimer = 0;
  let rafId = null;

  function animate(now) {
    if (document.hidden) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const elapsed = now / 1000;

    if (camGoalPos && camGoalTarget) {
      camera.position.lerp(camGoalPos, 0.08);
      controls.target.lerp(camGoalTarget, 0.08);
      if (
        camera.position.distanceTo(camGoalPos) < 0.08 &&
        controls.target.distanceTo(camGoalTarget) < 0.08
      ) {
        camGoalPos = null;
        camGoalTarget = null;
      }
    }

    controls.update();
    cityCtrl.update(dt, elapsed);
    renderer.render(scene, camera);
    updateSpatialPins();

    frames++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      if (hudFps) hudFps.textContent = `${Math.round(frames / fpsTimer)} FPS`;
      frames = 0;
      fpsTimer = 0;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rafId === null) {
      lastNow = performance.now();
      rafId = requestAnimationFrame(animate);
    }
  });

  rafId = requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
