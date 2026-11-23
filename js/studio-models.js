import * as THREE from 'three';

/**
 * Isolated Studio 3D Model Builders (v3 SolarSync Daylight Edition)
 * Rich architectural white walls, warm amber interior glow, royal-navy PV modules,
 * cedar timber decks & lush multi-cluster trees on travertine plinths.
 */

export function buildIsolatedStudioModel(scene, modelKey, materials, state) {
  const group = new THREE.Group();
  scene.add(group);

  const { matWhite, matTimber, matSolar, matGlass, matDark, matSilver, matOrange, matEmerald, matAmberGlow, matFoliage } = materials;

  // Landscaped Travertine Studio Plinth
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.1, 0.28, 48), matSilver);
  plinth.position.y = 0.14;
  plinth.receiveShadow = true;
  group.add(plinth);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.86, 0.04, 8, 64), matOrange);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.29;
  group.add(ring);

  function box(w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }

  function addMiniTree(x, z, scale = 0.85, matLeaf = matFoliage[0]) {
    const t = new THREE.Group();
    t.position.set(x, 0.28, z);
    t.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.65, 6), matDark);
    trunk.position.y = 0.32;
    t.add(trunk);
    [
      [0, 1.0, 0, 0.45],
      [-0.25, 0.85, 0.18, 0.34],
      [0.25, 0.88, -0.15, 0.34]
    ].forEach(([ox, oy, oz, r]) => {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), matLeaf);
      c.position.set(ox, oy, oz);
      c.castShadow = true;
      t.add(c);
    });
    group.add(t);
  }

  const animTargets = {
    solarGroup: null,
    doorMesh: null,
    airflowRings: [],
    interiorLight: null,
    statusBar: null
  };

  if (modelKey === 'home') {
    box(5.4, 0.2, 4.4, 0, 0.28, 0.1, matTimber);
    box(4.2, 0.08, 3.2, 0, 0.48, 0, matTimber);
    box(2.6, 1.5, 0.1, 0, 0.72, -1.25, matAmberGlow);

    // Architectural white cubic shell
    box(0.24, 2.35, 3.6, -2.05, 0.48, 0, matWhite);
    box(4.35, 2.35, 0.24, 0, 0.48, -1.68, matWhite);
    box(4.55, 0.28, 3.85, 0, 2.82, 0, matWhite);

    // Panoramic glass + dark mullions
    box(3.4, 2.28, 0.06, 0.35, 0.5, 1.68, matGlass);
    box(0.06, 2.28, 3.3, 2.08, 0.5, 0, matGlass);
    [-1.1, 0, 1.1, 2.05].forEach((mx) => box(0.06, 2.3, 0.08, mx, 0.5, 1.68, matDark));

    // Sloped Roof Solar Array
    const pv = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 2.6), matSolar);
    pv.position.set(0, 3.32, 0);
    pv.rotation.x = 0.22;
    pv.castShadow = true;
    group.add(pv);

    // Wall LiFePO4 Battery + V2H EV
    animTargets.statusBar = box(0.24, 0.95, 0.55, -2.25, 0.7, 0.5, matOrange);
    box(1.0, 0.32, 1.75, -3.1, 0.48, 1.2, matWhite);
    box(0.82, 0.24, 0.95, -3.1, 0.8, 1.1, matGlass);

    addMiniTree(3.2, -1.6, 0.95, matFoliage[0]);
    addMiniTree(-3.2, -1.8, 0.82, matFoliage[1]);

    const interiorLight = new THREE.PointLight('#FFAD42', 4.5, 8);
    interiorLight.position.set(0.2, 1.6, 0.2);
    group.add(interiorLight);
    animTargets.interiorLight = interiorLight;
  } else if (modelKey === 'charger') {
    box(1.75, 3.55, 1.15, 0.3, 0.28, 0, matWhite);
    box(0.95, 1.15, 0.08, 0.3, 2.35, 0.58, matSolar);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.35, 1.2, 0.62);
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.25, 0.08), matGlass);
    doorMesh.position.x = 0.62;
    doorPivot.add(doorMesh);
    group.add(doorPivot);
    animTargets.doorMesh = doorPivot;

    box(2.2, 0.14, 1.55, 0.3, 3.85, 0.08, matSilver);
    animTargets.statusBar = box(1.55, 0.12, 0.12, 0.3, 3.62, 0.59, matOrange);

    // 100 kWh Na-ion Buffer Pack
    box(1.55, 1.85, 1.3, -1.8, 0.28, 0, matSilver);
    box(0.18, 1.35, 1.34, -1.8, 0.52, 0, matOrange);
    addMiniTree(2.9, -1.5, 0.78, matFoliage[0]);
  } else if (modelKey === 'ac') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 3.4, 32), matWhite);
    body.position.y = 1.98;
    body.castShadow = true;
    const topPv = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.16, 32), matSolar);
    topPv.position.y = 3.74;
    const louver = box(1.25, 0.95, 0.16, 0, 2.35, 1.05, matDark);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.14, 32), matEmerald);
    band.position.y = 2.05;
    group.add(body, topPv, louver, band);
    animTargets.statusBar = band;

    for (let i = 0; i < 3; i++) {
      const flowRing = new THREE.Mesh(new THREE.TorusGeometry(1.3 + i * 0.45, 0.04, 8, 36), matEmerald);
      flowRing.rotation.x = Math.PI / 2;
      flowRing.position.y = 2.55 + i * 0.35;
      group.add(flowRing);
      animTargets.airflowRings.push(flowRing);
    }
    addMiniTree(-2.8, -1.6, 0.8, matFoliage[1]);
  } else {
    box(6.0, 0.16, 4.6, 0, 0.28, 0, matSilver);
    [-1.6, 1.6].forEach((bx) => {
      box(1.35, 0.16, 0.85, bx, 0.32, 1.55, matFoliage[0]);
      box(0.28, 1.15, 0.24, bx, 0.44, -1.3, matWhite);
    });
    [-2.1, 2.1].forEach((px) => box(0.24, 2.65, 0.24, px, 0.44, -1.35, matDark));

    const solarPivot = new THREE.Group();
    solarPivot.position.set(0, 3.08, -0.15);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.14, 3.5), matSolar);
    canopy.castShadow = true;
    solarPivot.add(canopy);
    group.add(solarPivot);
    animTargets.solarGroup = solarPivot;
    addMiniTree(3.6, -1.9, 0.88, matFoliage[1]);
  }

  function update(elapsed) {
    if (modelKey === 'charger' && animTargets.doorMesh) {
      const targetRot = state.activeMode === 'B' ? -1.15 : 0;
      animTargets.doorMesh.rotation.y += (targetRot - animTargets.doorMesh.rotation.y) * 0.1;
    }
    if (modelKey === 'ac') {
      animTargets.airflowRings.forEach((r, idx) => {
        const s = 1 + ((elapsed * 0.8 + idx * 0.33) % 1) * 0.45;
        r.scale.set(s, s, 1);
      });
    }
    if (modelKey === 'parking' && animTargets.solarGroup) {
      const targetTilt = state.activeMode === 'B' ? -0.36 : -0.14;
      animTargets.solarGroup.rotation.x += (targetTilt - animTargets.solarGroup.rotation.x) * 0.08;
    }
    if (modelKey === 'home' && animTargets.interiorLight) {
      animTargets.interiorLight.intensity = state.activeMode === 'B' ? 7.5 : 4.2;
    }
  }

  return { group, animTargets, update };
}
