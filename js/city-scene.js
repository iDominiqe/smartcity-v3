import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { attachTopographicGLSL } from './shaders/topo-shaders.js';

/**
 * Studio-Grade 3D Smart City Diorama (v3 SolarSync Edition)
 * Features:
 *  - Modernist White Solar Home V2H centerpiece with warm amber glowing interior
 *  - Multi-cluster lush architectural trees (Deep Forest, Olive, Sage & Autumn Ochre)
 *  - Procedural 512px monocrystalline royal-navy PV texture & warm cedar timber slats
 *  - PMREMGenerator + RoomEnvironment softbox studio reflections
 *  - 4 cohesive urban sectors, sculpted island with GLSL isolines, canal & cruising EVs
 *  - HD Studio Daylight PBR (default) vs Clay Low-PC Maquette toggle
 */

export const SECTOR_VIEWS = {
  overview: {
    pos: new THREE.Vector3(0.5, 11.8, 22.5),
    target: new THREE.Vector3(0, -1.0, 2.0)
  },
  solar: {
    pos: new THREE.Vector3(-15.2, 8.6, 5.2),
    target: new THREE.Vector3(-8.4, 0.9, -3.5)
  },
  ev: {
    pos: new THREE.Vector3(15.2, 7.6, 5.8),
    target: new THREE.Vector3(8.2, 0.7, -1.6)
  },
  home: {
    pos: new THREE.Vector3(4.8, 4.9, 9.6),
    target: new THREE.Vector3(0, 0.85, 0.4)
  },
  hvac: {
    pos: new THREE.Vector3(13.8, 6.8, 12.6),
    target: new THREE.Vector3(7.2, 0.6, 4.4)
  }
};

export const SECTOR_ANCHORS = {
  solar: new THREE.Vector3(-8.2, 4.2, -3.6),
  ev: new THREE.Vector3(7.2, 3.2, -1.8),
  home: new THREE.Vector3(0.0, 3.7, 0.0),
  hvac: new THREE.Vector3(6.4, 3.2, 4.0)
};

function createPhotorealSolarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Monocrystalline royal navy gradient base
  const bg = ctx.createLinearGradient(0, 0, 512, 512);
  bg.addColorStop(0, '#163360');
  bg.addColorStop(0.5, '#1D447E');
  bg.addColorStop(1, '#122B52');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle cell grid (8x16 wafers)
  const cols = 8;
  const rows = 16;
  const cw = 512 / cols;
  const ch = 512 / rows;

  ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
  ctx.lineWidth = 1.5;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, 512);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ch);
    ctx.lineTo(512, r * ch);
    ctx.stroke();
  }

  // Fine horizontal busbar fingers
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.lineWidth = 1;
  for (let c = 0; c < cols; c++) {
    const bx = c * cw + cw * 0.5;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx, 512);
    ctx.stroke();
  }

  // Monocrystalline corner chamfers (diamond dots)
  ctx.fillStyle = 'rgba(226, 232, 240, 0.42)';
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.arc(c * cw, r * ch, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Diagonal anti-reflective glass sheen
  const sheen = ctx.createLinearGradient(0, 0, 512, 340);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createWarmTimberTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#D2A679';
  ctx.fillRect(0, 0, 256, 256);

  const tones = ['#C89B6E', '#D9B186', '#BA8B5E', '#CFA274'];
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = tones[(x / 16) % tones.length];
    ctx.fillRect(x, 0, 15, 256);
    ctx.fillStyle = 'rgba(92, 58, 28, 0.22)';
    ctx.fillRect(x + 15, 0, 1, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createArchFacadeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#F7F5F2';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 14; y < 246; y += 28) {
    for (let x = 14; x < 242; x += 30) {
      const warmLit = (x + y) % 4 === 0;
      ctx.fillStyle = warmLit ? '#FDE6B8' : '#7C8B99';
      ctx.fillRect(x, y, 18, 17);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createStagedCityBuilder(scene, renderer, { i18n, initialQuality = 'hd', initialTheme = 'light' } = {}) {
  const world = {
    root: new THREE.Group(),
    layers: {
      terrain: new THREE.Group(),
      buildings: new THREE.Group(),
      solar: new THREE.Group(),
      traffic: new THREE.Group(),
      energy: new THREE.Group(),
      leds: new THREE.Group()
    },
    materials: {
      islandStoneHd: null,
      islandStoneClay: null,
      meadowHd: null,
      meadowClay: null,
      whiteArch: null,
      darkMullion: null,
      silverFrame: null,
      timberHd: null,
      timberClay: null,
      solarHd: null,
      solarClay: null,
      facadeHd: null,
      glassHd: null,
      glassClay: null,
      interiorGlow: null,
      canalHd: null,
      canalClay: null,
      roadStone: null,
      orangeGlow: null,
      emeraldGlow: null,
      treeBark: null,
      foliageHd: [],
      foliageClay: null
    },
    shaders: {
      hdUniforms: null,
      clayUniforms: null
    },
    meshes: {
      islandSkirt: null,
      meadowDisc: null,
      canalMesh: null,
      timberParts: [],
      facadeTowers: [],
      solarPanels: [],
      glassParts: [],
      foliageClusters: [],
      trackingWings: [],
      hubRings: [],
      fanRotors: [],
      evVehicles: [],
      energyPulses: [],
      ledHeads: []
    },
    lights: {
      ambient: null,
      hemi: null,
      mainDir: null,
      fillDir: null,
      homeInterior: null,
      pavilionInterior: null
    },
    textures: {
      solar: null,
      timber: null,
      facade: null
    },
    envTexture: null,
    quality: initialQuality,
    theme: initialTheme,
    lightingMode: 'day',
    sunProgress: 0.62,
    pulseBoost: false,
    isBuilt: false
  };

  scene.add(world.root);
  Object.values(world.layers).forEach((g) => world.root.add(g));

  // Shared Architectural Materials
  world.materials.whiteArch = new THREE.MeshStandardMaterial({
    color: '#FAF9F6',
    roughness: 0.58,
    metalness: 0.04
  });
  world.materials.darkMullion = new THREE.MeshStandardMaterial({
    color: '#2A3038',
    roughness: 0.42,
    metalness: 0.55
  });
  world.materials.silverFrame = new THREE.MeshStandardMaterial({
    color: '#CBD5E1',
    roughness: 0.34,
    metalness: 0.65
  });
  world.materials.meadowHd = new THREE.MeshStandardMaterial({
    color: '#DCE5D5',
    roughness: 0.92,
    metalness: 0.02
  });
  world.materials.meadowClay = new THREE.MeshStandardMaterial({
    color: '#EDEFF2',
    roughness: 0.88,
    metalness: 0.02
  });
  world.materials.timberClay = new THREE.MeshStandardMaterial({
    color: '#E2E6EC',
    roughness: 0.8,
    metalness: 0.05
  });
  world.materials.solarClay = new THREE.MeshStandardMaterial({
    color: '#D5DEE8',
    roughness: 0.48,
    metalness: 0.22
  });
  world.materials.glassClay = new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65
  });
  world.materials.glassHd = new THREE.MeshPhysicalMaterial({
    color: '#E8F4FA',
    roughness: 0.08,
    metalness: 0.08,
    transmission: 0.48,
    transparent: true,
    opacity: 0.68,
    ior: 1.45,
    reflectivity: 0.85
  });
  world.materials.interiorGlow = new THREE.MeshStandardMaterial({
    color: '#FEF3C7',
    emissive: new THREE.Color('#F59E0B'),
    emissiveIntensity: 1.45,
    roughness: 0.35
  });
  world.materials.canalHd = new THREE.MeshStandardMaterial({
    color: '#5CB8E4',
    roughness: 0.16,
    metalness: 0.22,
    emissive: new THREE.Color('#0284C7'),
    emissiveIntensity: 0.16
  });
  world.materials.canalClay = new THREE.MeshStandardMaterial({
    color: '#CBD5E1',
    roughness: 0.45,
    metalness: 0.1
  });
  world.materials.roadStone = new THREE.MeshStandardMaterial({
    color: '#E8E6E1',
    roughness: 0.78,
    metalness: 0.05
  });
  world.materials.orangeGlow = new THREE.MeshBasicMaterial({
    color: '#F25C19'
  });
  world.materials.emeraldGlow = new THREE.MeshBasicMaterial({
    color: '#10B981'
  });
  world.materials.treeBark = new THREE.MeshStandardMaterial({
    color: '#6E5542',
    roughness: 0.9,
    metalness: 0.02
  });
  world.materials.foliageClay = new THREE.MeshStandardMaterial({
    color: '#E2E6EB',
    roughness: 0.85,
    metalness: 0.02
  });
  // Curated 4-tone foliage palette matching Image 1's lush trees!
  world.materials.foliageHd = [
    new THREE.MeshStandardMaterial({ color: '#2A5628', roughness: 0.84, metalness: 0.02 }), // Deep forest green
    new THREE.MeshStandardMaterial({ color: '#538132', roughness: 0.82, metalness: 0.02 }), // Sunlit olive
    new THREE.MeshStandardMaterial({ color: '#7EA240', roughness: 0.8, metalness: 0.02 }),  // Bright sage green
    new THREE.MeshStandardMaterial({ color: '#D98A2B', roughness: 0.78, metalness: 0.02 })  // Warm autumn ochre
  ];

  function addBox(parent, w, h, d, x, y, z, mat, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = opts.receiveShadow ?? true;
    parent.add(mesh);
    if (opts.isGlass) world.meshes.glassParts.push(mesh);
    if (opts.isTimber) world.meshes.timberParts.push(mesh);
    if (opts.isFacadeTower) world.meshes.facadeTowers.push(mesh);
    return mesh;
  }

  function addDetailedSolarArray(parent, w, d, x, y, z, tiltX = -0.35, cols = 2, rows = 2, tracking = false) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.06, d + 0.12), world.materials.silverFrame);
    frame.rotation.x = tiltX;
    frame.castShadow = true;
    group.add(frame);

    const cellW = (w - (cols - 1) * 0.06) / cols;
    const cellD = (d - (rows - 1) * 0.06) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pv = new THREE.Mesh(new THREE.BoxGeometry(cellW, 0.04, cellD), world.materials.solarClay);
        const ox = -w / 2 + cellW / 2 + c * (cellW + 0.06);
        const oz = -d / 2 + cellD / 2 + r * (cellD + 0.06);
        pv.position.set(ox, Math.sin(-tiltX) * oz + 0.04, Math.cos(-tiltX) * oz);
        pv.rotation.x = tiltX;
        pv.castShadow = true;
        group.add(pv);
        world.meshes.solarPanels.push(pv);
      }
    }

    parent.add(group);
    if (tracking) world.meshes.trackingWings.push(group);
    return group;
  }

  function addLushTree(parent, x, y, z, scale = 1, paletteIdx = 0) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);
    tree.scale.setScalar(scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.85, 7),
      world.materials.treeBark
    );
    trunk.position.y = 0.42;
    trunk.castShadow = true;
    tree.add(trunk);

    const matHd = world.materials.foliageHd[paletteIdx % world.materials.foliageHd.length];
    const tuftOffsets = [
      [0, 1.35, 0, 0.62],
      [-0.36, 1.12, 0.24, 0.46],
      [0.38, 1.15, -0.2, 0.48],
      [0.18, 1.56, 0.22, 0.44],
      [-0.24, 1.48, -0.26, 0.42],
      [0.02, 1.02, -0.35, 0.38]
    ];

    tuftOffsets.forEach(([ox, oy, oz, rad]) => {
      const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 1), matHd);
      tuft.position.set(ox, oy, oz);
      tuft.castShadow = true;
      tuft.receiveShadow = true;
      tree.add(tuft);
      world.meshes.foliageClusters.push({ mesh: tuft, matHd });
    });

    parent.add(tree);
    return tree;
  }

  const tasks = [
    {
      label: i18n.t('preStepInit'),
      fn: async () => {
        // Soft studio daylight environment reflections
        try {
          if (renderer) {
            const pmrem = new THREE.PMREMGenerator(renderer);
            const roomEnv = new RoomEnvironment();
            world.envTexture = pmrem.fromScene(roomEnv, 0.04).texture;
            scene.environment = world.envTexture;
            roomEnv.dispose();
            pmrem.dispose();
          }
        } catch (err) {
          console.warn('RoomEnvironment skipped:', err);
        }

        world.lights.ambient = new THREE.AmbientLight('#FFFFFF', 0.65);
        world.lights.hemi = new THREE.HemisphereLight('#FFFDF9', '#D6D3CD', 0.85);
        world.lights.mainDir = new THREE.DirectionalLight('#FFF6EA', 1.65);
        world.lights.mainDir.position.set(14, 22, 14);
        world.lights.mainDir.shadow.mapSize.set(2048, 2048);
        world.lights.mainDir.shadow.bias = -0.0005;
        world.lights.mainDir.shadow.camera.near = 2;
        world.lights.mainDir.shadow.camera.far = 65;
        world.lights.mainDir.shadow.camera.left = -22;
        world.lights.mainDir.shadow.camera.right = 22;
        world.lights.mainDir.shadow.camera.top = 20;
        world.lights.mainDir.shadow.camera.bottom = -20;

        world.lights.fillDir = new THREE.DirectionalLight('#E0F2FE', 0.45);
        world.lights.fillDir.position.set(-16, 12, -14);

        // Warm cozy amber interior glow inside Hero White Solar Home (Image 1!)
        world.lights.homeInterior = new THREE.PointLight('#FFAD42', 5.2, 11, 1.4);
        world.lights.homeInterior.position.set(0.2, 1.55, 0.2);

        world.lights.pavilionInterior = new THREE.PointLight('#FBBF24', 2.8, 7, 1.5);
        world.lights.pavilionInterior.position.set(7.4, 1.4, 4.4);

        scene.add(
          world.lights.ambient,
          world.lights.hemi,
          world.lights.mainDir,
          world.lights.fillDir,
          world.lights.homeInterior,
          world.lights.pavilionInterior
        );
        return 4;
      }
    },
    {
      label: i18n.t('preStepTerrain'),
      fn: async () => {
        // Sculpted Island Base with GLSL Topographic Isolines
        const skirtGeo = new THREE.CylinderGeometry(16.6, 17.8, 1.1, 48, 4);
        world.materials.islandStoneHd = new THREE.MeshStandardMaterial({
          color: '#ECE9E3',
          roughness: 0.84,
          metalness: 0.04
        });
        world.materials.islandStoneClay = new THREE.MeshStandardMaterial({
          color: '#E8ECF1',
          roughness: 0.86,
          metalness: 0.02
        });
        world.shaders.hdUniforms = attachTopographicGLSL(world.materials.islandStoneHd, {
          contourColor: '#C2B8AC',
          contourAlpha: 0.34,
          pulseColor: '#F25C19',
          pulseAlpha: 0.14
        });
        world.shaders.clayUniforms = attachTopographicGLSL(world.materials.islandStoneClay, {
          contourColor: '#94A3B8',
          contourAlpha: 0.25,
          pulseColor: '#F25C19',
          pulseAlpha: 0.08
        });

        const skirtMesh = new THREE.Mesh(skirtGeo, world.materials.islandStoneHd);
        skirtMesh.position.y = -0.56;
        skirtMesh.receiveShadow = true;
        world.layers.terrain.add(skirtMesh);
        world.meshes.islandSkirt = skirtMesh;

        // Meadow grass top deck
        const meadowGeo = new THREE.CylinderGeometry(16.1, 16.3, 0.16, 48);
        const meadowMesh = new THREE.Mesh(meadowGeo, world.materials.meadowHd);
        meadowMesh.position.y = -0.05;
        meadowMesh.receiveShadow = true;
        world.layers.terrain.add(meadowMesh);
        world.meshes.meadowDisc = meadowMesh;

        // Subtle studio contact shadow plane beneath island
        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(54, 54),
          new THREE.ShadowMaterial({ opacity: 0.13 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -1.12;
        shadowPlane.receiveShadow = true;
        world.layers.terrain.add(shadowPlane);

        // Smooth Circular Smart Boulevard Loop
        const roadCurve = new THREE.CatmullRomCurve3(
          [
            new THREE.Vector3(-11.5, 0.08, -1.2),
            new THREE.Vector3(-6.2, 0.08, -6.8),
            new THREE.Vector3(3.0, 0.08, -6.5),
            new THREE.Vector3(10.8, 0.08, -1.8),
            new THREE.Vector3(10.5, 0.08, 6.2),
            new THREE.Vector3(2.8, 0.08, 9.6),
            new THREE.Vector3(-6.8, 0.08, 8.6),
            new THREE.Vector3(-12.2, 0.08, 3.8)
          ],
          true
        );

        const roadGeo = new THREE.TubeGeometry(roadCurve, 84, 0.56, 4, true);
        roadGeo.scale(1, 0.08, 1);
        const roadMesh = new THREE.Mesh(roadGeo, world.materials.roadStone);
        roadMesh.receiveShadow = true;
        world.layers.terrain.add(roadMesh);

        // Glowing Solar Orange & Emerald Microgrid Conduit Lines
        const conduitGeo = new THREE.TubeGeometry(roadCurve, 84, 0.045, 6, true);
        const orangeConduit = new THREE.Mesh(conduitGeo, world.materials.orangeGlow);
        orangeConduit.position.y = 0.08;
        const emeraldConduit = new THREE.Mesh(conduitGeo, world.materials.emeraldGlow);
        emeraldConduit.position.set(0.18, 0.08, 0.18);
        world.layers.energy.add(orangeConduit, emeraldConduit);

        // Hydro-Energy Canal curving across front-center valley
        const canalCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-14.0, 0.04, 4.8),
          new THREE.Vector3(-5.0, 0.04, 4.2),
          new THREE.Vector3(4.5, 0.04, 4.6),
          new THREE.Vector3(14.0, 0.04, 5.2)
        ]);
        const canalGeo = new THREE.TubeGeometry(canalCurve, 40, 0.65, 4, false);
        canalGeo.scale(1, 0.06, 1);
        const canalMesh = new THREE.Mesh(canalGeo, world.materials.canalHd);
        world.layers.terrain.add(canalMesh);
        world.meshes.canalMesh = canalMesh;

        // Minimalist White Bridges over canal
        [-3.8, 3.8].forEach((bx) => {
          addBox(world.layers.terrain, 1.4, 0.16, 1.9, bx, 0.08, 4.4, world.materials.whiteArch);
        });

        world.roadCurve = roadCurve;
        return 6;
      }
    },
    {
      label: i18n.t('preStepGrid'),
      fn: async () => {
        // ------------------------------------------------------------------
        // HERO CENTERPIECE: Sector 03 Modern White Solar Home V2H at (0, 0, 0)
        // Inspired directly by Image 1 & Image 2's iconic modernist white cube!
        // ------------------------------------------------------------------
        const hero = new THREE.Group();
        hero.position.set(0, 0.02, 0);
        world.layers.buildings.add(hero);

        // Warm cedar timber terrace deck + white stone step
        addBox(hero, 6.6, 0.24, 5.4, 0, 0, 0.2, world.materials.timberClay, { isTimber: true });
        addBox(hero, 2.4, 0.12, 1.0, 0.5, 0, 3.1, world.materials.whiteArch);

        // Warm glowing interior oak floor + minimalist interior furniture
        addBox(hero, 4.6, 0.08, 3.6, 0, 0.24, 0, world.materials.timberClay, { isTimber: true });
        addBox(hero, 1.6, 0.45, 0.75, -0.8, 0.32, -0.5, world.materials.whiteArch);
        addBox(hero, 0.9, 0.28, 0.55, 0.5, 0.32, 0.3, world.materials.timberClay, { isTimber: true });
        // Warm glowing interior back accent panel
        addBox(hero, 3.2, 1.8, 0.1, 0, 0.55, -1.55, world.materials.interiorGlow, { castShadow: false });

        // Thick White Architectural Structural Shell (open front & right glass bays)
        addBox(hero, 0.28, 2.75, 4.2, -2.4, 0.24, 0, world.materials.whiteArch); // Left structural wall
        addBox(hero, 5.1, 2.75, 0.28, 0, 0.24, -1.96, world.materials.whiteArch); // Rear structural wall
        addBox(hero, 1.35, 2.75, 0.28, -1.75, 0.24, 1.96, world.materials.whiteArch); // Front-left return
        addBox(hero, 5.2, 0.32, 4.4, 0, 2.95, 0, world.materials.whiteArch); // Cantilevered upper roof slab

        // Sloped Roof White Parapet Wedge + Elevated Solar Panel Array
        const roofTiltGroup = new THREE.Group();
        roofTiltGroup.position.set(0, 3.3, 0);
        hero.add(roofTiltGroup);

        addBox(roofTiltGroup, 4.8, 0.16, 4.0, 0, 0, 0, world.materials.whiteArch);
        // Sleek dark mounting rails tucked cleanly beneath solar array
        [-1.3, 1.3].forEach((rx) => {
          addBox(roofTiltGroup, 0.08, 0.14, 2.8, rx, 0.16, 0, world.materials.darkMullion);
        });
        addDetailedSolarArray(roofTiltGroup, 4.3, 3.1, 0, 0.56, 0, 0.22, 4, 2, false);

        // Floor-to-Ceiling Panoramic Glass Windows + Charcoal Mullions
        addBox(hero, 3.45, 2.65, 0.06, 0.65, 0.26, 1.96, world.materials.glassClay, { isGlass: true, castShadow: false });
        addBox(hero, 0.06, 2.65, 3.85, 2.45, 0.26, 0, world.materials.glassClay, { isGlass: true, castShadow: false });
        [-0.95, 0.1, 1.15, 2.38].forEach((mx) => {
          addBox(hero, 0.06, 2.7, 0.08, mx, 0.25, 1.96, world.materials.darkMullion);
        });
        [-1.1, 0.1, 1.25].forEach((mz) => {
          addBox(hero, 0.08, 2.7, 0.06, 2.45, 0.25, mz, world.materials.darkMullion);
        });

        // Exterior Wall Battery (LiFePO4) + Parked White V2H EV
        addBox(hero, 0.26, 1.15, 0.68, -2.62, 0.45, 0.6, world.materials.whiteArch);
        addBox(hero, 0.28, 0.16, 0.5, -2.62, 1.28, 0.6, world.materials.orangeGlow, { castShadow: false });

        const parkedEv = new THREE.Group();
        parkedEv.position.set(-3.75, 0.24, 1.55);
        addBox(parkedEv, 1.15, 0.38, 2.05, 0, 0.1, 0, world.materials.whiteArch);
        addBox(parkedEv, 0.96, 0.3, 1.12, 0, 0.48, -0.08, world.materials.glassClay, { isGlass: true });
        hero.add(parkedEv);

        // ------------------------------------------------------------------
        // SECTOR 01: Solar Microgrid Hub & Clean Skyline (-8.6, 0, -4.0)
        // ------------------------------------------------------------------
        const hubGroup = new THREE.Group();
        hubGroup.position.set(-8.6, 0.02, -4.0);
        world.layers.buildings.add(hubGroup);

        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(2.8, 3.1, 0.22, 24),
          world.materials.roadStone
        );
        pad.position.y = 0.11;
        pad.receiveShadow = true;
        hubGroup.add(pad);

        const coreTower = new THREE.Mesh(
          new THREE.CylinderGeometry(1.0, 1.2, 3.6, 6),
          world.materials.whiteArch
        );
        coreTower.position.y = 2.0;
        coreTower.castShadow = true;
        hubGroup.add(coreTower);

        for (let r = 0; r < 2; r++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.32 + r * 0.2, 0.045, 8, 32),
            r === 0 ? world.materials.orangeGlow : world.materials.emeraldGlow
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 1.45 + r * 1.15;
          hubGroup.add(ring);
          world.meshes.hubRings.push(ring);
        }

        // 6 Dual-Axis Tracking Solar Wings
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 3; col++) {
            const tx = -12.6 + col * 2.0;
            const tz = -7.8 + row * 1.9;
            const mast = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.08, 0.85, 8),
              world.materials.silverFrame
            );
            mast.position.set(tx, 0.42, tz);
            world.layers.solar.add(mast);
            addDetailedSolarArray(world.layers.solar, 1.5, 1.0, tx, 0.9, tz, -0.4, 2, 1, true);
          }
        }

        // Clean White Architectural Skyline Towers along Northern Arc
        const towers = [
          [-3.2, -9.2, 1.8, 4.4, 1.7],
          [-0.4, -10.2, 2.3, 5.6, 1.9],
          [2.4, -9.4, 1.7, 3.9, 1.7],
          [5.0, -8.4, 1.6, 3.3, 1.6]
        ];
        towers.forEach(([x, z, w, h, d]) => {
          addBox(world.layers.buildings, w, h, d, x, 0, z, world.materials.whiteArch, { isFacadeTower: true });
          addDetailedSolarArray(world.layers.solar, w * 0.82, d * 0.82, x, h + 0.14, z, -0.22, 2, 2, false);
        });

        return 14;
      }
    },
    {
      label: i18n.t('preStepDistricts'),
      fn: async () => {
        // ------------------------------------------------------------------
        // SECTOR 02: SafeCharge X1 EV Canopy (+8.4, 0, -2.2)
        // ------------------------------------------------------------------
        const evGroup = new THREE.Group();
        evGroup.position.set(8.4, 0.02, -2.2);
        world.layers.buildings.add(evGroup);

        addBox(evGroup, 5.2, 0.16, 3.8, 0, 0, 0, world.materials.roadStone);
        [-1.9, 1.9].forEach((px) => {
          addBox(evGroup, 0.22, 2.3, 0.22, px, 0.16, -0.8, world.materials.darkMullion);
        });

        const canopy = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.14, 3.1), world.materials.whiteArch);
        canopy.position.set(0, 2.52, 0);
        canopy.rotation.x = -0.15;
        canopy.castShadow = true;
        evGroup.add(canopy);
        addDetailedSolarArray(world.layers.solar, 4.6, 2.7, 8.4, 2.66, -2.2, -0.15, 4, 2, false);

        // 4 SafeCharge X1 pedestals with glowing orange status stripes + 2 charging EVs
        [-1.2, -0.4, 0.4, 1.2].forEach((cx) => {
          addBox(evGroup, 0.28, 1.25, 0.26, cx, 0.16, -0.55, world.materials.whiteArch);
          addBox(evGroup, 0.29, 0.12, 0.08, cx, 1.1, -0.41, world.materials.orangeGlow, { castShadow: false });
        });
        [-0.85, 0.85].forEach((vx) => {
          addBox(evGroup, 0.72, 0.34, 1.35, vx, 0.16, 0.65, world.materials.whiteArch);
          addBox(evGroup, 0.56, 0.22, 0.68, vx, 0.5, 0.6, world.materials.glassClay, { isGlass: true });
        });

        // ------------------------------------------------------------------
        // SECTOR 04: NEO Clim® Glass Pavilion (+7.4, 0, +4.4) & HUWART Parking (-8.0, 0, +3.6)
        // ------------------------------------------------------------------
        const hvacGroup = new THREE.Group();
        hvacGroup.position.set(7.4, 0.02, 4.4);
        world.layers.buildings.add(hvacGroup);

        addBox(hvacGroup, 3.8, 1.95, 2.6, 0, 0, 0, world.materials.whiteArch);
        addBox(hvacGroup, 3.2, 1.45, 0.18, 0, 0.22, 1.28, world.materials.glassClay, { isGlass: true });
        addBox(hvacGroup, 0.55, 1.3, 0.42, -1.45, 0, 1.68, world.materials.whiteArch);

        [-0.85, 0.85].forEach((fx) => {
          addBox(hvacGroup, 0.75, 0.38, 0.75, fx, 1.95, 0, world.materials.silverFrame);
          const rotor = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.038, 6, 18),
            world.materials.emeraldGlow
          );
          rotor.rotation.x = Math.PI / 2;
          rotor.position.set(fx, 2.38, 0);
          hvacGroup.add(rotor);
          world.meshes.fanRotors.push(rotor);
        });

        // HUWART Solar & Bio-Permeable Eco-Parking (-8.0, 0, +3.6)
        const parkGroup = new THREE.Group();
        parkGroup.position.set(-8.0, 0.02, 3.6);
        world.layers.buildings.add(parkGroup);
        addBox(parkGroup, 4.2, 0.14, 3.2, 0, 0, 0, world.materials.roadStone);
        addBox(parkGroup, 3.8, 0.16, 0.7, 0, 0.02, 0.9, world.materials.foliageHd[1], { castShadow: false });
        [-1.5, 1.5].forEach((px) => addBox(parkGroup, 0.18, 1.8, 0.18, px, 0.14, -0.8, world.materials.darkMullion));
        addDetailedSolarArray(world.layers.solar, 3.8, 2.2, -8.0, 2.0, 3.6, -0.22, 3, 2, false);

        // ------------------------------------------------------------------
        // LUSH MULTI-CLUSTER TREES FLANKING HERO HOME & ISLAND (Image 1!)
        // ------------------------------------------------------------------
        const treeSpecs = [
          // Dense flanking frame directly behind/around white hero Solar Home
          [-4.2, -2.4, 1.45, 0],
          [-2.6, -3.5, 1.25, 3], // Autumn amber
          [-4.9, 0.4, 1.15, 1],
          [-4.4, 2.6, 0.95, 2],
          [3.9, -2.5, 1.38, 0],
          [2.4, -3.6, 1.12, 1],
          [4.8, 0.2, 1.28, 3], // Autumn amber
          [4.2, 2.4, 1.05, 0],
          // Perimeter valley groves
          [-10.6, 0.2, 1.1, 2],
          [-12.2, 5.4, 1.0, 3],
          [-5.2, 7.2, 0.95, 1],
          [2.0, 7.6, 1.05, 0],
          [11.8, 2.2, 1.15, 2],
          [11.4, -5.0, 1.05, 3],
          [6.8, -6.8, 0.92, 1],
          [-6.5, -7.2, 1.0, 0]
        ];
        treeSpecs.forEach(([tx, tz, sc, pIdx]) => {
          addLushTree(world.layers.buildings, tx, 0, tz, sc, pIdx);
        });

        // 4 Autonomous Cruising EVs on Smart Boulevard
        for (let i = 0; i < 4; i++) {
          const car = new THREE.Group();
          addBox(car, 1.05, 0.34, 0.54, 0, 0.08, 0, world.materials.whiteArch);
          addBox(car, 0.58, 0.24, 0.44, -0.04, 0.4, 0, world.materials.glassClay, { isGlass: true });
          world.layers.traffic.add(car);
          world.meshes.evVehicles.push({ mesh: car, offset: i / 4 });
        }

        // 8 Smart LED Streetlamps
        for (let i = 0; i < 8; i++) {
          const pt = world.roadCurve.getPointAt(i / 8);
          const side = i % 2 === 0 ? -0.82 : 0.82;
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.06, 1.65, 6),
            world.materials.darkMullion
          );
          pole.position.set(pt.x, 0.82, pt.z + side);
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.14), world.materials.orangeGlow);
          head.position.set(pt.x, 1.66, pt.z + side * 0.82);
          world.layers.leds.add(pole, head);
          world.meshes.ledHeads.push(head);
        }

        // 10 Flowing Solar Energy Conduit Pulses
        for (let i = 0; i < 10; i++) {
          const pulse = new THREE.Mesh(
            new THREE.SphereGeometry(0.11, 8, 8),
            i % 2 === 0 ? world.materials.orangeGlow : world.materials.emeraldGlow
          );
          world.layers.energy.add(pulse);
          world.meshes.energyPulses.push({ mesh: pulse, offset: i / 10 });
        }

        return 14;
      }
    },
    {
      label: i18n.t('preStepTextures'),
      fn: async () => {
        world.textures.solar = createPhotorealSolarTexture();
        world.textures.timber = createWarmTimberTexture();
        world.textures.facade = createArchFacadeTexture();

        world.materials.solarHd = new THREE.MeshStandardMaterial({
          map: world.textures.solar,
          roughness: 0.18,
          metalness: 0.55,
          envMapIntensity: 1.25
        });

        world.materials.timberHd = new THREE.MeshStandardMaterial({
          map: world.textures.timber,
          roughness: 0.72,
          metalness: 0.04
        });

        world.materials.facadeHd = new THREE.MeshStandardMaterial({
          map: world.textures.facade,
          roughness: 0.55,
          metalness: 0.08
        });

        return 4;
      }
    },
    {
      label: i18n.t('preStepCompile'),
      fn: async () => {
        world.isBuilt = true;
        applyQualityMode(world, world.quality);
        applyThemeToScene(world, world.theme);
        applyLightingMode(world, world.lightingMode);
        setSunAngle(world, world.sunProgress);
        return 2;
      }
    }
  ];

  function applyQualityMode(w, quality) {
    w.quality = quality;
    if (!w.isBuilt) return;
    const isHd = quality === 'hd';

    if (w.meshes.islandSkirt) {
      w.meshes.islandSkirt.material = isHd ? w.materials.islandStoneHd : w.materials.islandStoneClay;
    }
    if (w.meshes.meadowDisc) {
      w.meshes.meadowDisc.material = isHd ? w.materials.meadowHd : w.materials.meadowClay;
    }
    if (w.meshes.canalMesh) {
      w.meshes.canalMesh.material = isHd ? w.materials.canalHd : w.materials.canalClay;
    }

    w.meshes.timberParts.forEach((m) => {
      m.material = isHd ? w.materials.timberHd : w.materials.timberClay;
    });
    w.meshes.facadeTowers.forEach((m) => {
      m.material = isHd ? w.materials.facadeHd : w.materials.whiteArch;
    });
    w.meshes.solarPanels.forEach((m) => {
      m.material = isHd ? w.materials.solarHd : w.materials.solarClay;
    });
    w.meshes.glassParts.forEach((m) => {
      m.material = isHd ? w.materials.glassHd : w.materials.glassClay;
    });
    w.meshes.foliageClusters.forEach(({ mesh, matHd }) => {
      mesh.material = isHd ? matHd : w.materials.foliageClay;
    });

    if (w.lights.homeInterior) {
      w.lights.homeInterior.intensity = isHd ? 5.2 : 1.5;
    }
    if (w.lights.pavilionInterior) {
      w.lights.pavilionInterior.intensity = isHd ? 2.8 : 0.8;
    }

    if (renderer) {
      renderer.shadowMap.enabled = isHd;
      if (w.lights.mainDir) w.lights.mainDir.castShadow = isHd;
      const dpr = window.devicePixelRatio || 1;
      renderer.setPixelRatio(isHd ? Math.min(dpr, 1.85) : 1);
      renderer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight, false);
    }
  }

  function applyThemeToScene(w, theme) {
    w.theme = theme;
    const isDark = theme === 'dark';

    if (w.materials.islandStoneHd) {
      w.materials.islandStoneHd.color.set(isDark ? '#1A222B' : '#ECE9E3');
    }
    if (w.materials.meadowHd) {
      w.materials.meadowHd.color.set(isDark ? '#1F2C27' : '#DCE5D5');
    }
    if (w.materials.roadStone) {
      w.materials.roadStone.color.set(isDark ? '#2B343E' : '#E8E6E1');
    }
    if (w.materials.islandStoneClay) {
      w.materials.islandStoneClay.color.set(isDark ? '#1E252E' : '#E8ECF1');
    }
    if (w.materials.meadowClay) {
      w.materials.meadowClay.color.set(isDark ? '#252F3A' : '#EDEFF2');
    }
    if (w.shaders.hdUniforms) {
      w.shaders.hdUniforms.uContourColor.value.set(isDark ? '#F59E0B' : '#C2B8AC');
      w.shaders.hdUniforms.uPulseAlpha.value = isDark ? 0.24 : 0.14;
    }
    if (w.isBuilt) applyLightingMode(w, w.lightingMode);
  }

  function setSunAngle(w, progress = 0.62) {
    w.sunProgress = progress;
    if (!w.lights.mainDir || w.lightingMode !== 'day') return;
    const angle = (progress - 0.5) * Math.PI * 0.85;
    const x = Math.sin(angle) * 20;
    const y = 14 + Math.cos(angle) * 10;
    const z = 12 + Math.cos(angle) * 4;
    w.lights.mainDir.position.set(x, y, z);
  }

  function applyLightingMode(w, mode) {
    w.lightingMode = mode;
    if (!w.lights.ambient || !w.lights.hemi || !w.lights.mainDir) return;
    const isDarkTheme = w.theme === 'dark';

    if (mode === 'day') {
      w.lights.ambient.intensity = isDarkTheme ? 0.3 : 0.68;
      w.lights.hemi.intensity = isDarkTheme ? 0.36 : 0.85;
      w.lights.mainDir.color.set(isDarkTheme ? '#FED7AA' : '#FFF6EA');
      w.lights.mainDir.intensity = isDarkTheme ? 0.85 : 1.65;
      setSunAngle(w, w.sunProgress);
      if (w.lights.homeInterior) w.lights.homeInterior.intensity = isDarkTheme ? 9.0 : (w.quality === 'hd' ? 5.6 : 1.8);
    } else if (mode === 'sunset') {
      w.lights.ambient.intensity = 0.42;
      w.lights.hemi.intensity = 0.48;
      w.lights.mainDir.color.set('#FB923C');
      w.lights.mainDir.intensity = 1.6;
      w.lights.mainDir.position.set(-22, 10, 12);
      if (w.lights.homeInterior) w.lights.homeInterior.intensity = 7.5;
    } else {
      w.lights.ambient.intensity = 0.28;
      w.lights.hemi.intensity = 0.32;
      w.lights.mainDir.color.set('#93C5FD');
      w.lights.mainDir.intensity = 0.72;
      w.lights.mainDir.position.set(14, 18, -14);
      if (w.lights.homeInterior) w.lights.homeInterior.intensity = 9.0;
    }
  }

  function update(dt, elapsed) {
    const speedFactor = world.pulseBoost ? 2.2 : 1.0;

    if (world.shaders.hdUniforms) world.shaders.hdUniforms.uTime.value = elapsed;
    if (world.shaders.clayUniforms) world.shaders.clayUniforms.uTime.value = elapsed;

    world.meshes.trackingWings.forEach((wing, i) => {
      wing.rotation.y = Math.sin(elapsed * 0.35 + i) * 0.16;
    });

    world.meshes.hubRings.forEach((ring, i) => {
      const s = 1 + Math.sin(elapsed * 2.1 * speedFactor + i) * 0.04;
      ring.scale.set(s, s, 1);
    });

    world.meshes.fanRotors.forEach((rotor, i) => {
      const s = 1 + Math.sin(elapsed * 2.8 + i) * 0.08;
      rotor.scale.set(s, s, 1);
    });

    if (world.roadCurve && world.layers.traffic.visible) {
      world.meshes.evVehicles.forEach((v) => {
        const t = (elapsed * 0.045 * speedFactor + v.offset) % 1;
        const pos = world.roadCurve.getPointAt(t);
        const tangent = world.roadCurve.getTangentAt(t);
        v.mesh.position.set(pos.x, 0.08, pos.z);
        v.mesh.rotation.y = Math.atan2(-tangent.z, tangent.x);
      });
    }

    if (world.roadCurve && world.layers.energy.visible) {
      world.meshes.energyPulses.forEach((p, idx) => {
        const t = (elapsed * 0.11 * speedFactor + p.offset) % 1;
        const pos = world.roadCurve.getPointAt(t);
        p.mesh.position.set(pos.x, 0.18, pos.z + (idx % 2 === 0 ? 0 : 0.18));
      });
    }
  }

  return {
    world,
    tasks,
    applyQualityMode: (q) => applyQualityMode(world, q),
    applyThemeToScene: (t) => applyThemeToScene(world, t),
    applyLightingMode: (m) => applyLightingMode(world, m),
    setSunAngle: (p) => setSunAngle(world, p),
    update
  };
}
