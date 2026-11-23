/**
 * SolarSync / Suno SVG Data Visualizations (v3)
 * - Dot-Matrix Solar Efficiency Chart (24x9 matrix with orange gradient & tooltip)
 * - Power Vertical Bar Spectrum (36 rounded orange bars + Peak Hour badge)
 * - Energy Balance Donut Ring (SVG ring with orange-to-amber gradient)
 * - Total System Output Semicircular Dial Gauge (45 radial ticks + needle)
 * - Sunlight Hours Captured Semi-Arc (curved orange-amber arc + glowing sun marker)
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, String(v)));
  if (parent) parent.appendChild(node);
  return node;
}

const DEFAULT_EFF_SERIES = [
  2, 3, 2, 4, 5, 4, 6, 7, 6, 8, 9, 7,
  8, 9, 8, 6, 7, 6, 5, 4, 3, 2, 2, 1
];

export function renderDotMatrixChart(svgEl, tooltipEl, levels = DEFAULT_EFF_SERIES) {
  if (!svgEl) return;
  svgEl.innerHTML = '';

  const cols = levels.length;
  const rows = 9;
  const w = 340;
  const h = 118;
  svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const defs = el('defs', {}, svgEl);
  const grad = el('linearGradient', { id: 'dotOrangeGrad', x1: '0%', y1: '100%', x2: '0%', y2: '0%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#FCA572' }, grad);
  el('stop', { offset: '55%', 'stop-color': '#F25C19' }, grad);
  el('stop', { offset: '100%', 'stop-color': '#DC4204' }, grad);

  const padX = 8;
  const padY = 8;
  const stepX = (w - padX * 2) / Math.max(1, cols - 1);
  const stepY = (h - padY * 2) / Math.max(1, rows - 1);

  for (let c = 0; c < cols; c++) {
    const activeCount = Math.max(1, Math.min(rows, Math.round(levels[c])));
    const cx = padX + c * stepX;

    // Invisible hover column hit target
    const hitRect = el(
      'rect',
      {
        x: cx - stepX / 2,
        y: 0,
        width: stepX,
        height: h,
        fill: 'transparent',
        style: 'cursor:pointer'
      },
      svgEl
    );

    const hour = 6 + Math.round((c / Math.max(1, cols - 1)) * 15);
    const pct = Math.round(68 + (activeCount / rows) * 29);
    const kw = Math.round(140 + (activeCount / rows) * 315);

    hitRect.addEventListener('mouseenter', () => {
      if (!tooltipEl) return;
      const hh = String(hour).padStart(2, '0');
      tooltipEl.textContent = `${hh}:00 · ${pct}% · ${kw} kW`;
      tooltipEl.classList.add('visible');
    });
    hitRect.addEventListener('mouseleave', () => {
      tooltipEl?.classList.remove('visible');
    });

    for (let r = 0; r < rows; r++) {
      const cy = h - padY - r * stepY;
      const isActive = r < activeCount;
      const radius = isActive ? (r === activeCount - 1 ? 3.5 : 2.9) : 2.3;
      const dot = el(
        'circle',
        {
          cx: cx.toFixed(1),
          cy: cy.toFixed(1),
          r: radius,
          fill: isActive ? 'url(#dotOrangeGrad)' : 'var(--dot-inactive)',
          opacity: isActive ? (0.62 + (r / rows) * 0.38).toFixed(2) : '0.85'
        },
        svgEl
      );
      dot.style.pointerEvents = 'none';
    }
  }
}

export function renderPowerBarsChart(svgEl, tooltipEl, barsData = null) {
  if (!svgEl) return;
  svgEl.innerHTML = '';

  const count = 34;
  const values =
    barsData ||
    Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const bell = Math.exp(-Math.pow((t - 0.45) / 0.28, 2));
      const wave = 0.14 * Math.sin(i * 1.4) + 0.08 * Math.cos(i * 0.7);
      return Math.max(0.18, Math.min(1, 0.24 + bell * 0.68 + wave));
    });

  const w = 340;
  const h = 118;
  svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const defs = el('defs', {}, svgEl);
  const barGrad = el('linearGradient', { id: 'powerBarGrad', x1: '0%', y1: '100%', x2: '0%', y2: '0%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#FDBA74' }, barGrad);
  el('stop', { offset: '100%', 'stop-color': '#F25C19' }, barGrad);

  const barW = 4.6;
  const gap = (w - 16 - count * barW) / (count - 1);
  let peakIdx = 0;
  let peakVal = 0;
  values.forEach((v, i) => {
    if (v > peakVal) {
      peakVal = v;
      peakIdx = i;
    }
  });

  values.forEach((val, i) => {
    const bh = Math.max(12, val * 84);
    const x = 8 + i * (barW + gap);
    const y = h - 8 - bh;
    const isPeak = i === peakIdx;

    const rect = el(
      'rect',
      {
        x: x.toFixed(1),
        y: y.toFixed(1),
        width: barW,
        height: bh.toFixed(1),
        rx: 2.3,
        fill: isPeak ? '#DF4808' : 'url(#powerBarGrad)',
        opacity: isPeak ? '1' : '0.88',
        style: 'cursor:pointer'
      },
      svgEl
    );

    rect.addEventListener('mouseenter', () => {
      if (!tooltipEl) return;
      const kw = Math.round(120 + val * 365);
      tooltipEl.textContent = `${isPeak ? 'Peak · ' : ''}${kw} kW`;
      tooltipEl.classList.add('visible');
    });
    rect.addEventListener('mouseleave', () => tooltipEl?.classList.remove('visible'));

    if (isPeak) {
      const badgeW = 58;
      const bx = Math.min(w - badgeW - 4, Math.max(4, x - badgeW / 2 + barW / 2));
      const by = Math.max(2, y - 22);
      el('rect', { x: bx, y: by, width: badgeW, height: 17, rx: 8.5, fill: '#F25C19' }, svgEl);
      const txt = el(
        'text',
        {
          x: bx + badgeW / 2,
          y: by + 11.5,
          'text-anchor': 'middle',
          fill: '#FFFFFF',
          'font-size': '8.5',
          'font-weight': '700',
          'font-family': 'Inter, sans-serif'
        },
        svgEl
      );
      txt.textContent = 'Peak Hour';
    }
  });
}

export function renderDonutRing(svgEl, ratio = 0.78) {
  if (!svgEl) return;
  svgEl.innerHTML = '';
  const size = 124;
  svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`);

  const defs = el('defs', {}, svgEl);
  const grad = el('linearGradient', { id: 'donutOrangeGrad', x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#FBBF24' }, grad);
  el('stop', { offset: '50%', 'stop-color': '#FF6E2E' }, grad);
  el('stop', { offset: '100%', 'stop-color': '#E44B0A' }, grad);

  const cx = size / 2;
  const cy = size / 2;
  const r = 49;
  const circ = 2 * Math.PI * r;

  el(
    'circle',
    {
      cx,
      cy,
      r,
      fill: 'none',
      stroke: 'var(--track-neutral)',
      'stroke-width': 10
    },
    svgEl
  );

  const clamped = Math.max(0.08, Math.min(0.98, ratio));
  const arc = el(
    'circle',
    {
      cx,
      cy,
      r,
      fill: 'none',
      stroke: 'url(#donutOrangeGrad)',
      'stroke-width': 10,
      'stroke-linecap': 'round',
      'stroke-dasharray': `${(circ * clamped).toFixed(1)} ${circ.toFixed(1)}`,
      transform: `rotate(-90 ${cx} ${cy})`
    },
    svgEl
  );
  arc.style.transition = 'stroke-dasharray 0.5s ease';
}

export function renderDialGauge(svgEl, valueKw = 312, maxKw = 500) {
  if (!svgEl) return;
  svgEl.innerHTML = '';

  const w = 240;
  const h = 114;
  svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const cx = w / 2;
  const cy = h - 12;
  const rOuter = 86;
  const rInner = 70;
  const ticks = 45;
  const ratio = Math.max(0.05, Math.min(1, valueKw / maxKw));

  for (let i = 0; i < ticks; i++) {
    const t = i / (ticks - 1);
    const angle = Math.PI + t * Math.PI;
    const x1 = cx + Math.cos(angle) * rInner;
    const y1 = cy + Math.sin(angle) * rInner;
    const x2 = cx + Math.cos(angle) * rOuter;
    const y2 = cy + Math.sin(angle) * rOuter;

    const isLit = t <= ratio;
    const color = isLit
      ? t < 0.5
        ? '#F25C19'
        : '#F59E0B'
      : 'var(--dot-inactive)';

    el(
      'line',
      {
        x1: x1.toFixed(1),
        y1: y1.toFixed(1),
        x2: x2.toFixed(1),
        y2: y2.toFixed(1),
        stroke: color,
        'stroke-width': isLit ? 2.4 : 1.8,
        'stroke-linecap': 'round'
      },
      svgEl
    );
  }

  // Sharp Orange Pointer Needle
  const needleAngle = Math.PI + ratio * Math.PI;
  const nx = cx + Math.cos(needleAngle) * (rOuter + 4);
  const ny = cy + Math.sin(needleAngle) * (rOuter + 4);

  el(
    'line',
    {
      x1: cx,
      y1: cy,
      x2: nx.toFixed(1),
      y2: ny.toFixed(1),
      stroke: '#F25C19',
      'stroke-width': 3,
      'stroke-linecap': 'round'
    },
    svgEl
  );
  el('circle', { cx, cy, r: 5.5, fill: '#F25C19' }, svgEl);
  el('circle', { cx, cy, r: 2.4, fill: '#FFFFFF' }, svgEl);

  const label = el(
    'text',
    {
      x: cx,
      y: cy - 22,
      'text-anchor': 'middle',
      fill: 'var(--ink-primary)',
      'font-family': 'Plus Jakarta Sans, Inter, sans-serif',
      'font-size': '19',
      'font-weight': '700'
    },
    svgEl
  );
  label.textContent = `${Math.round(valueKw)} kW`;
}

export function renderSunlightArc(svgEl, progress = 0.62, hoursText = '6.8 hr') {
  if (!svgEl) return;
  svgEl.innerHTML = '';

  const w = 220;
  const h = 76;
  svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const defs = el('defs', {}, svgEl);
  const grad = el('linearGradient', { id: 'sunArcGrad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#F25C19' }, grad);
  el('stop', { offset: '60%', 'stop-color': '#F97316' }, grad);
  el('stop', { offset: '100%', 'stop-color': '#FACC15' }, grad);

  const cx = w / 2;
  const cy = h - 10;
  const r = 64;

  // Background track arc (180 deg)
  el(
    'path',
    {
      d: `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`,
      fill: 'none',
      stroke: 'var(--track-neutral)',
      'stroke-width': 7,
      'stroke-linecap': 'round'
    },
    svgEl
  );

  // Active sunlit arc up to progress
  const p = Math.max(0.08, Math.min(0.95, progress));
  const endAngle = Math.PI + p * Math.PI;
  const ex = cx + Math.cos(endAngle) * r;
  const ey = cy + Math.sin(endAngle) * r;
  const largeArc = 0;

  el(
    'path',
    {
      d: `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`,
      fill: 'none',
      stroke: 'url(#sunArcGrad)',
      'stroke-width': 7.5,
      'stroke-linecap': 'round'
    },
    svgEl
  );

  // Glowing Sun Marker Dot
  el('circle', { cx: ex.toFixed(1), cy: ey.toFixed(1), r: 8, fill: 'rgba(242, 92, 25, 0.24)' }, svgEl);
  el('circle', { cx: ex.toFixed(1), cy: ey.toFixed(1), r: 4.5, fill: '#F25C19', stroke: '#FFFFFF', 'stroke-width': 1.5 }, svgEl);

  // Time Ticks 6AM / 12PM / 6PM
  const ticks = [
    { x: cx - r - 12, y: cy + 2, txt: '6AM' },
    { x: cx, y: cy - r + 14, txt: '12PM' },
    { x: cx + r + 12, y: cy + 2, txt: '6PM' }
  ];
  ticks.forEach((tk) => {
    const t = el(
      'text',
      {
        x: tk.x,
        y: tk.y,
        'text-anchor': 'middle',
        fill: 'var(--ink-muted)',
        'font-size': '8.5',
        'font-family': 'JetBrains Mono, monospace'
      },
      svgEl
    );
    t.textContent = tk.txt;
  });

  // Center Hours Label
  const centerTxt = el(
    'text',
    {
      x: cx,
      y: cy - 12,
      'text-anchor': 'middle',
      fill: 'var(--ink-primary)',
      'font-size': '15',
      'font-weight': '700',
      'font-family': 'Plus Jakarta Sans, Inter, sans-serif'
    },
    svgEl
  );
  centerTxt.textContent = hoursText;
}
