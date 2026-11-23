import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { I18nManager } from './i18n.js';
import { GPUPreloader } from './gpu-preloader.js';
import { buildIsolatedStudioModel } from './studio-models.js';

function createStudioSolarTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#183A6E';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(203,213,225,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function initStudioPage() {
  const params = new URLSearchParams(window.location.search);
  const bodyAttr = document.body.getAttribute('data-studio-model');
  const rawModel = bodyAttr || params.get('model') || 'home';
  const modelKey = ['home', 'charger', 'ac', 'parking'].includes(rawModel) ? rawModel : 'home';

  const i18n = new I18nManager('en');
  i18n.applyToDOM();

  let currentTheme = localStorage.getItem('neo_v3_theme') || 'light';
  let currentQuality = localStorage.getItem('neo_v3_quality') || 'hd';
  const studioState = { activeMode: 'A' };

  const canvas = document.getElementById('studio-canvas');
  const langSelect = document.getElementById('lang-select');
  const hudBuffers = document.getElementById('studio-gpu-buffers');
  const hudFps = document.getElementById('studio-fps');
  const btnModeA = document.getElementById('btn-studio-mode-a');
  const btnModeB = document.getElementById('btn-studio-mode-b');

  if (langSelect) langSelect.value = i18n.lang;

  document.querySelectorAll('[data-model-link]').forEach((el) => {
    if (el.getAttribute('data-model-link') === modelKey) {
      el.classList.add('active');
    }
  });

  function syncText() {
    const studioDict = i18n.dict.studio || {};
    const mInfo = studioDict.models?.[modelKey] || {};

    const backBtn = document.getElementById('btn-back-city');
    const isoBadge = document.getElementById('studio-isolated-badge');
    const loadTitle = document.getElementById('studio-loading-title');
    if (backBtn && studioDict.backCity) backBtn.textContent = studioDict.backCity;
    if (isoBadge && studioDict.isolatedBadge) isoBadge.textContent = studioDict.isolatedBadge;
    if (loadTitle && studioDict.loadingTitle) loadTitle.textContent = studioDict.loadingTitle;

    if (mInfo.title) document.getElementById('studio-title').textContent = mInfo.title;
    if (mInfo.subtitle) document.getElementById('studio-subtitle').textContent = mInfo.subtitle;
    for (let i = 1; i <= 4; i++) {
      if (mInfo[`spec${i}Lbl`]) document.getElementById(`spec-lbl-${i}`).textContent = mInfo[`spec${i}Lbl`];
      if (mInfo[`spec${i}Val`]) document.getElementById(`spec-val-${i}`).textContent = mInfo[`spec${i}Val`];
    }
    if (btnModeA && mInfo.modeA) btnModeA.textContent = mInfo.modeA;
    if (btnModeB && mInfo.modeB) btnModeB.textContent = mInfo.modeB;
  }

  const solarTex = createStudioSolarTex();
  const matWhite = new THREE.MeshStandardMaterial({ color: '#FAF9F6', roughness: 0.56, metalness: 0.04 });
  const matTimber = new THREE.MeshStandardMaterial({ color: '#CFA072', roughness: 0.72, metalness: 0.04 });
  const matSilver = new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.42, metalness: 0.28 });
  const matDark = new THREE.MeshStandardMaterial({ color: '#272E36', roughness: 0.45, metalness: 0.5 });
  const matSolar = new THREE.MeshStandardMaterial({ map: solarTex, roughness: 0.2, metalness: 0.55 });
  const matOrange = new THREE.MeshBasicMaterial({ color: '#F25C19' });
  const matEmerald = new THREE.MeshBasicMaterial({ color: '#10B981' });
  const matAmberGlow = new THREE.MeshStandardMaterial({
    color: '#FFFBEB',
    emissive: new THREE.Color('#FBBF24'),
    emissiveIntensity: 1.05
  });
  const matGlass = new THREE.MeshStandardMaterial({
    color: '#E0F2FE',
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.68
  });
  const matFoliage = [
    new THREE.MeshStandardMaterial({ color: '#2A5628', roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ color: '#538132', roughness: 0.8 })
  ];

  let renderer = null;
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

  const scene = new THREE.Scene();
  try {
    if (renderer) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
      roomEnv.dispose();
      pmrem.dispose();
    }
  } catch (err) {
    console.warn('Studio RoomEnvironment skipped:', err);
  }

  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.2,
    80
  );
  camera.position.set(8.2, 5.4, 9.8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.target.set(0, 1.3, 0);

  const ambient = new THREE.AmbientLight('#FFFFFF', 0.72);
  const hemi = new THREE.HemisphereLight('#FFFDF9', '#D6D3CD', 0.85);
  const dirLight = new THREE.DirectionalLight('#FFF6EA', 1.55);
  dirLight.position.set(8, 14, 10);
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(ambient, hemi, dirLight);

  function updateMaterials() {
    const isHd = currentQuality === 'hd';
    matSolar.map = isHd ? solarTex : null;
    matSolar.color.set(isHd ? '#FFFFFF' : '#CBD5E1');
    matSolar.needsUpdate = true;

    if (studioState.activeMode === 'B') {
      matOrange.color.set('#F59E0B');
      matEmerald.color.set('#F97316');
    } else {
      matOrange.color.set('#F25C19');
      matEmerald.color.set('#10B981');
    }

    if (renderer) {
      renderer.shadowMap.enabled = isHd;
      dirLight.castShadow = isHd;
      const dpr = window.devicePixelRatio || 1;
      renderer.setPixelRatio(isHd ? Math.min(dpr, 1.8) : 1);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  }

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('neo_v3_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-btn]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-theme-btn') === theme);
    });
    updateMaterials();
  }

  function applyQuality(quality) {
    currentQuality = quality;
    localStorage.setItem('neo_v3_quality', quality);
    document.documentElement.setAttribute('data-quality', quality);
    document.querySelectorAll('[data-quality-btn]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-quality-btn') === quality);
    });
    preloader.setProfileLabel(quality === 'hd' ? i18n.t('qualHd') : i18n.t('qualClay'));
    updateMaterials();
  }

  document.querySelectorAll('[data-theme-btn]').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.getAttribute('data-theme-btn')));
  });
  document.querySelectorAll('[data-quality-btn]').forEach((btn) => {
    btn.addEventListener('click', () => applyQuality(btn.getAttribute('data-quality-btn')));
  });
  langSelect?.addEventListener('change', (e) => {
    i18n.setLanguage(e.target.value);
    syncText();
  });

  btnModeA?.addEventListener('click', () => {
    studioState.activeMode = 'A';
    btnModeA.classList.add('active');
    btnModeB?.classList.remove('active');
    updateMaterials();
  });
  btnModeB?.addEventListener('click', () => {
    studioState.activeMode = 'B';
    btnModeB.classList.add('active');
    btnModeA?.classList.remove('active');
    updateMaterials();
  });

  const preloader = new GPUPreloader();
  preloader.totalBuffers = 14;

  syncText();
  applyTheme(currentTheme);
  applyQuality(currentQuality);

  if (!renderer) {
    preloader.overlay?.classList.add('is-ready');
    return;
  }

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  });

  let modelCtrl = null;
  const tasks = [
    { label: i18n.t('preStepInit'), fn: async () => 3 },
    {
      label: i18n.t('preStepDistricts'),
      fn: async () => {
        modelCtrl = buildIsolatedStudioModel(
          scene,
          modelKey,
          { matWhite, matTimber, matSolar, matGlass, matDark, matSilver, matOrange, matEmerald, matAmberGlow, matFoliage },
          studioState
        );
        return 8;
      }
    },
    { label: i18n.t('preStepCompile'), fn: async () => { updateMaterials(); return 3; } }
  ];

  preloader.run(tasks, { renderer, scene, camera, doneLabel: i18n.t('preStepDone') }).then((cnt) => {
    if (hudBuffers) hudBuffers.textContent = String(cnt);
  });

  let lastNow = performance.now();
  let frames = 0;
  let timer = 0;
  function animate(now) {
    if (!document.hidden) {
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      controls.update();
      modelCtrl?.update(now / 1000);
      renderer.render(scene, camera);
      frames++;
      timer += dt;
      if (timer >= 0.5) {
        if (hudFps) hudFps.textContent = `${Math.round(frames / timer)} FPS`;
        frames = 0;
        timer = 0;
      }
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudioPage);
} else {
  initStudioPage();
}
