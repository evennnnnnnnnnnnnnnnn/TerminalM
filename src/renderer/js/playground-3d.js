/* ============================================
   Playground 3D — Virtual Office Scene
   Three.js-powered 3D workspace where each
   terminal agent has a desk with a character
   that works or rests.
   ============================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/* ---- Color Palette (Catppuccin) ---- */
const C = {
  base:    0x1e1e2e, mantle:  0x181825, crust:  0x11111b,
  surface0: 0x313244, surface1: 0x45475a, surface2: 0x585b70,
  overlay0: 0x6c6f85, text:    0xcdd6f4,
  blue:    0x89b4fa, green:   0xa6e3a1, red:    0xf38ba8,
  yellow:  0xf9e2af, mauve:   0xcba6f7, peach:  0xfab387,
  teal:    0x94e2d5, sky:     0x89dceb, pink:   0xf5c2e7,
  lavender:0xb4befe, rosewater:0xf5e0dc,
};

/* ---- Character palette per process type ---- */
const CHAR_PALETTE = {
  claude:     { body: 0xcba6f7, accent: 0xf5c2e7, hat: 0x89b4fa  },
  node:       { body: 0xa6e3a1, accent: 0x1e1e2e, hat: 0x40a02b  },
  git:        { body: 0xf38ba8, accent: 0x1e1e2e, hat: 0xf38ba8  },
  python:     { body: 0x89b4fa, accent: 0xf9e2af, hat: 0xf9e2af  },
  docker:     { body: 0x89dceb, accent: 0x1e1e2e, hat: 0x04a5e5  },
  powershell: { body: 0x89b4fa, accent: 0x012456, hat: 0x89b4fa  },
  ssh:        { body: 0xa6e3a1, accent: 0x1e1e2e, hat: 0x40a02b  },
  vim:        { body: 0xa6e3a1, accent: 0x019833, hat: 0xa6e3a1  },
  build:      { body: 0xfab387, accent: 0xf9e2af, hat: 0xfab387  },
  test:       { body: 0xa6e3a1, accent: 0x1e1e2e, hat: 0x40a02b  },
  database:   { body: 0x94e2d5, accent: 0x1e1e2e, hat: 0x94e2d5  },
  idle:       { body: 0x585b70, accent: 0x45475a, hat: 0x585b70  },
  unknown:    { body: 0x89b4fa, accent: 0x1e1e2e, hat: 0x89b4fa  },
};

/* ---- Screen content per process ---- */
const SCREEN_TEXT = {
  claude:     'thinking...\n> reason\n> plan',
  node:       '$ npm run dev\n> listening\n  :3000',
  git:        '* main\n  feat/ui\n  +3 -1',
  python:     '>>> import\n... data\nOK [3.2s]',
  docker:     'CONTAINER\nweb  Up 2m\ndb   Up 2m',
  powershell: 'PS C:\\>\nGet-Item\nMode  d--',
  ssh:        'ssh remote\n$ uptime\n 14:02 up',
  vim:        '~\n~\n-- INSERT',
  build:      'compiling..\n[====  ]\n67% done',
  test:       'PASS auth\nPASS api\n12 passed',
  database:   'SELECT *\nFROM users\n(42 rows)',
  idle:       '$ _\n\n',
  unknown:    '> _\n\n',
};

/* ---- Model paths (relative to terminal.html) ---- */
const MODEL_BASE = '../assets/models/';
const MODEL_PATHS = {
  desk: MODEL_BASE + 'workstation/desk.glb',
};

/* ---- Procedural Wood Grain Texture ---- */
function _generateWoodTextures(width = 512, height = 512) {
  // Seeded pseudo-random for reproducible grain
  let _seed = 42;
  function rand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed & 0x7fffffff) / 0x7fffffff; }

  // Simple 2D noise via value-noise with interpolation
  const GRID = 64;
  const noiseGrid = new Float32Array(GRID * GRID);
  for (let i = 0; i < noiseGrid.length; i++) noiseGrid[i] = rand();

  function noise(x, y) {
    const gx = ((x % GRID) + GRID) % GRID;
    const gy = ((y % GRID) + GRID) % GRID;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const i00 = (iy % GRID) * GRID + (ix % GRID);
    const i10 = (iy % GRID) * GRID + ((ix + 1) % GRID);
    const i01 = ((iy + 1) % GRID) * GRID + (ix % GRID);
    const i11 = ((iy + 1) % GRID) * GRID + ((ix + 1) % GRID);
    const top = noiseGrid[i00] * (1 - sx) + noiseGrid[i10] * sx;
    const bot = noiseGrid[i01] * (1 - sx) + noiseGrid[i11] * sx;
    return top * (1 - sy) + bot * sy;
  }

  function fbm(x, y, octaves) {
    let v = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      v += noise(x * freq, y * freq) * amp;
      amp *= 0.5;
      freq *= 2;
    }
    return v;
  }

  // --- Color map ---
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  // Dark wood base tones (Catppuccin-ish dark walnut)
  const baseR = 55, baseG = 50, baseB = 62;    // dark base
  const grainR = 75, grainG = 65, grainB = 80;  // lighter grain streak
  const knotR = 40, knotG = 36, knotB = 48;     // dark knot

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Wood grain: stretch along X (horizontal grain direction)
      const nx = x / width * 8;
      const ny = y / height * 40; // much higher freq along Y = grain lines
      const warp = fbm(nx * 2, ny * 0.3, 3) * 4;
      const grain = Math.sin((ny + warp) * Math.PI * 2) * 0.5 + 0.5;

      // Fine grain detail
      const fine = fbm(nx * 12, ny * 3, 2) * 0.3;

      // Occasional darker streaks
      const streak = Math.pow(Math.sin((ny * 0.7 + fbm(nx, ny * 0.5, 2) * 3) * Math.PI) * 0.5 + 0.5, 3) * 0.25;

      const t = grain * 0.6 + fine + streak;
      const clamped = Math.max(0, Math.min(1, t));

      imgData.data[idx]     = baseR + (grainR - baseR) * clamped | 0;
      imgData.data[idx + 1] = baseG + (grainG - baseG) * clamped | 0;
      imgData.data[idx + 2] = baseB + (grainB - baseB) * clamped | 0;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // --- Roughness map (lighter grain = slightly smoother) ---
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rctx = roughCanvas.getContext('2d');
  const roughData = rctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const nx = x / width * 8;
      const ny = y / height * 40;
      const warp = fbm(nx * 2, ny * 0.3, 3) * 4;
      const grain = Math.sin((ny + warp) * Math.PI * 2) * 0.5 + 0.5;
      const fine = fbm(nx * 16, ny * 4, 2) * 0.2;
      // Roughness: 0.55 (smoother grain) to 0.85 (rougher between grains)
      const r = (0.85 - grain * 0.3 + fine) * 255 | 0;
      roughData.data[idx] = r;
      roughData.data[idx + 1] = r;
      roughData.data[idx + 2] = r;
      roughData.data[idx + 3] = 255;
    }
  }
  rctx.putImageData(roughData, 0, 0);

  // --- Normal map (subtle surface bumps from grain) ---
  const normCanvas = document.createElement('canvas');
  normCanvas.width = width;
  normCanvas.height = height;
  const nctx = normCanvas.getContext('2d');
  const normData = nctx.createImageData(width, height);
  // Read color luminance for height, then compute normals via Sobel
  const heightMap = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    heightMap[i] = (imgData.data[idx] + imgData.data[idx + 1] + imgData.data[idx + 2]) / (3 * 255);
  }
  const strength = 2.0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const l = heightMap[y * width + ((x - 1 + width) % width)];
      const r = heightMap[y * width + ((x + 1) % width)];
      const u = heightMap[((y - 1 + height) % height) * width + x];
      const d = heightMap[((y + 1) % height) * width + x];
      const dx = (l - r) * strength;
      const dy = (u - d) * strength;
      // Normal in tangent space: (dx, dy, 1) normalized, packed to 0-255
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      normData.data[idx]     = ((dx / len) * 0.5 + 0.5) * 255 | 0;
      normData.data[idx + 1] = ((dy / len) * 0.5 + 0.5) * 255 | 0;
      normData.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255 | 0;
      normData.data[idx + 3] = 255;
    }
  }
  nctx.putImageData(normData, 0, 0);

  const colorTex = new THREE.CanvasTexture(colorCanvas);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(1, 1);

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.repeat.set(1, 1);

  const normTex = new THREE.CanvasTexture(normCanvas);
  normTex.wrapS = normTex.wrapT = THREE.RepeatWrapping;
  normTex.repeat.set(1, 1);

  return { colorTex, roughTex, normTex };
}

/* ---- Grid layout for desk positions ---- */
const DESK_SPACING = 5;
const DESKS_PER_ROW = 4;

function deskPosition(index) {
  const row = Math.floor(index / DESKS_PER_ROW);
  const col = index % DESKS_PER_ROW;
  return {
    x: (col - (DESKS_PER_ROW - 1) / 2) * DESK_SPACING,
    z: row * DESK_SPACING,
  };
}

/* ===========================
   Playground3D Class
   =========================== */
class Playground3D {
  constructor(container) {
    this.container = container;
    this.agents = new Map(); // tabId -> { group, character, monitor, screenCanvas, ... }
    this._startTime = performance.now();
    this._lastScreenUpdate = 0;
    this._animFrame = null;
    this._disposed = false;
    this._onClickCb = null;  // callback(tabId)

    // Model cache: loaded GLB scenes keyed by path
    this._modelCache = new Map();
    this._modelLoading = new Map(); // path -> Promise
    this._loader = new GLTFLoader();

    // Generate wood grain textures once, reuse for all desks
    this._woodTextures = _generateWoodTextures();

    this._initScene();
    this._initLights();
    this._initFloor();
    this._initControls();
    this._initRaycaster();
    this._animate();

    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(container);

    // Preload available models
    this._preloadModels();
  }

  /* ---- Wood material ---- */
  _makeWoodMaterial() {
    const { colorTex, roughTex, normTex } = this._woodTextures;
    return new THREE.MeshStandardMaterial({
      map: colorTex,
      roughnessMap: roughTex,
      normalMap: normTex,
      normalScale: new THREE.Vector2(0.4, 0.4),
      metalness: 0.05,
    });
  }

  /* ---- Model loading ---- */
  _loadModel(path) {
    if (this._modelCache.has(path)) {
      return Promise.resolve(this._modelCache.get(path));
    }
    if (this._modelLoading.has(path)) {
      return this._modelLoading.get(path);
    }
    const promise = new Promise((resolve, reject) => {
      this._loader.load(
        path,
        (gltf) => {
          console.log(`[Playground3D] Loaded model: ${path}`, gltf.scene);
          this._modelCache.set(path, gltf.scene);
          this._modelLoading.delete(path);
          resolve(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn(`Failed to load model ${path}:`, err);
          this._modelLoading.delete(path);
          resolve(null); // Resolve null so fallback is used
        }
      );
    });
    this._modelLoading.set(path, promise);
    return promise;
  }

  _preloadModels() {
    const promises = [];
    for (const path of Object.values(MODEL_PATHS)) {
      promises.push(this._loadModel(path));
    }
    // Once all models are loaded, swap any fallback desks for real ones
    Promise.all(promises).then(() => {
      if (this._disposed) return;
      this._upgradeAllDesks();
    });
  }

  /* Swap fallback procedural desks for loaded GLB models */
  _upgradeAllDesks() {
    if (!this._modelCache.has(MODEL_PATHS.desk)) return;
    console.log(`[Playground3D] Upgrading ${this.agents.size} agent desk(s) to GLB model`);

    for (const [, agent] of this.agents) {
      if (agent.desk._usingModel) continue; // already using the model

      // Find and remove the fallback desk group (tagged with _isFallbackDesk)
      const oldDesk = agent.desk.group.children.find(c => c.userData._isFallbackDesk);
      if (!oldDesk) continue;

      // Dispose fallback geometry/materials
      oldDesk.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      });
      agent.desk.group.remove(oldDesk);

      // Add the real model
      const deskModel = this._buildDeskFromModel();
      if (deskModel) {
        deskModel.userData._isDeskModel = true;
        agent.desk.group.add(deskModel);
        agent.desk._usingModel = true;
      }
    }
  }

  _cloneModel(path) {
    const cached = this._modelCache.get(path);
    if (!cached) return null;
    // Deep clone the entire hierarchy so each instance has its own meshes
    const clone = cached.clone(true);
    // Deep-clone materials so each instance can be tinted independently
    clone.traverse((child) => {
      if (child.isMesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    return clone;
  }

  /* ---- Scene setup ---- */
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(C.base);
    this.scene.fog = new THREE.FogExp2(C.base, 0.012);

    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    this.camera.position.set(10, 14, 16);
    this.camera.lookAt(0, 0, 2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);
  }

  _initLights() {
    // Strong ambient so the scene is never dark
    const ambient = new THREE.AmbientLight(0xcdd6f4, 0.8);
    this.scene.add(ambient);

    // Hemisphere — bright sky, subtle ground bounce
    const hemi = new THREE.HemisphereLight(0xb4befe, 0x313244, 0.6);
    this.scene.add(hemi);

    // Primary directional — overhead, warm white, casts shadows
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(6, 16, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    dir.shadow.bias = -0.0005;
    dir.shadow.normalBias = 0.02;
    this.scene.add(dir);

    // Fill from the opposite side — no shadows
    const fill = new THREE.DirectionalLight(0x89b4fa, 0.4);
    fill.position.set(-8, 10, -6);
    this.scene.add(fill);
  }

  _initFloor() {
    // Ground plane — dark tile-like floor
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      color: C.mantle,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle grid lines on floor
    const gridHelper = new THREE.GridHelper(60, 60, C.surface0, C.surface0);
    gridHelper.position.y = 0.005;
    gridHelper.material.opacity = 0.12;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2.2; // Prevent going under floor
    this.controls.target.set(0, 0, 2);
    this.controls.update();
  }

  _initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this._hovered = null;

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      // Only respond to left click
      if (e.button !== 0) return;
      this._mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || !this._mouseDownPos) return;
      const dx = e.clientX - this._mouseDownPos.x;
      const dy = e.clientY - this._mouseDownPos.y;
      // Ignore if it was a drag (orbit)
      if (Math.abs(dx) + Math.abs(dy) > 6) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this._pickAgent();
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // Cursor style
    this.renderer.domElement.style.cursor = 'grab';
  }

  _pickAgent() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const allMeshes = [];
    for (const [tabId, agent] of this.agents) {
      agent.group.traverse((child) => {
        if (child.isMesh) {
          child.userData._agentTabId = tabId;
          allMeshes.push(child);
        }
      });
    }
    const hits = this.raycaster.intersectObjects(allMeshes, false);
    if (hits.length > 0) {
      const tabId = hits[0].object.userData._agentTabId;
      if (tabId && this._onClickCb) {
        this._onClickCb(tabId);
      }
    }
  }

  /* ---- Agent creation ---- */
  _buildCharacter(processType) {
    const palette = CHAR_PALETTE[processType] || CHAR_PALETTE.unknown;
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.6, metalness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.5, metalness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2e, roughness: 0.8 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xcdd6f4, roughness: 0.5 });

    // ---- Body / torso ----
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.7, 0.4);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.position.y = 1.2;
    torso.castShadow = true;
    group.add(torso);

    // ---- Head ----
    const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.5);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 1.87;
    head.castShadow = true;
    group.add(head);

    // ---- Eyes ----
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.1, 0.06);
    const eyeL = new THREE.Mesh(eyeGeo, whiteMat);
    eyeL.position.set(-0.12, 1.9, 0.26);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, whiteMat);
    eyeR.position.set(0.12, 1.9, 0.26);
    group.add(eyeR);

    // Pupils
    const pupilGeo = new THREE.BoxGeometry(0.04, 0.06, 0.02);
    const pupilL = new THREE.Mesh(pupilGeo, darkMat);
    pupilL.position.set(-0.12, 1.89, 0.3);
    group.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeo, darkMat);
    pupilR.position.set(0.12, 1.89, 0.3);
    group.add(pupilR);

    // ---- Hat / accessory (distinguishes process type) ----
    const hatMat = new THREE.MeshStandardMaterial({ color: palette.hat, roughness: 0.5, metalness: 0.15 });
    if (processType === 'claude') {
      // Crown / halo ring
      const ringGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 16);
      const ring = new THREE.Mesh(ringGeo, hatMat);
      ring.position.y = 2.3;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    } else if (processType === 'build') {
      // Hard hat
      const hatGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.18, 12);
      const hat = new THREE.Mesh(hatGeo, hatMat);
      hat.position.y = 2.22;
      hat.castShadow = true;
      group.add(hat);
      const brimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12);
      const brim = new THREE.Mesh(brimGeo, hatMat);
      brim.position.y = 2.14;
      group.add(brim);
    } else if (processType === 'docker') {
      // Whale fin on head
      const finGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
      const fin = new THREE.Mesh(finGeo, hatMat);
      fin.position.set(0, 2.28, -0.05);
      group.add(fin);
    } else if (processType === 'git') {
      // Branch antennae
      const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4);
      const ant1 = new THREE.Mesh(antGeo, hatMat);
      ant1.position.set(-0.15, 2.32, 0);
      ant1.rotation.z = 0.3;
      group.add(ant1);
      const ant2 = new THREE.Mesh(antGeo, hatMat);
      ant2.position.set(0.15, 2.32, 0);
      ant2.rotation.z = -0.3;
      group.add(ant2);
      const tipGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const tip1 = new THREE.Mesh(tipGeo, hatMat);
      tip1.position.set(-0.25, 2.48, 0);
      group.add(tip1);
      const tip2 = new THREE.Mesh(tipGeo, hatMat);
      tip2.position.set(0.25, 2.48, 0);
      group.add(tip2);
    } else if (processType === 'python') {
      // Two-tone beret
      const beretGeo = new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const beret = new THREE.Mesh(beretGeo, hatMat);
      beret.position.y = 2.15;
      group.add(beret);
    } else if (processType === 'database') {
      // Cylinder hat (like a DB cylinder)
      const cylGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12);
      const cyl = new THREE.Mesh(cylGeo, hatMat);
      cyl.position.y = 2.28;
      group.add(cyl);
    } else if (processType === 'vim') {
      // "V" antenna
      const vGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
      const v1 = new THREE.Mesh(vGeo, hatMat);
      v1.position.set(-0.1, 2.3, 0);
      v1.rotation.z = 0.2;
      group.add(v1);
      const v2 = new THREE.Mesh(vGeo, hatMat);
      v2.position.set(0.1, 2.3, 0);
      v2.rotation.z = -0.2;
      group.add(v2);
    } else if (processType === 'ssh') {
      // Antenna dish on head
      const dishGeo = new THREE.SphereGeometry(0.15, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const dish = new THREE.Mesh(dishGeo, hatMat);
      dish.position.y = 2.15;
      dish.rotation.x = Math.PI;
      group.add(dish);
      const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4);
      const rod = new THREE.Mesh(rodGeo, hatMat);
      rod.position.y = 2.3;
      group.add(rod);
    } else if (processType === 'test') {
      // Checkmark on head
      const checkGeo = new THREE.BoxGeometry(0.3, 0.06, 0.06);
      const check = new THREE.Mesh(checkGeo, new THREE.MeshStandardMaterial({ color: 0xa6e3a1 }));
      check.position.y = 2.25;
      check.rotation.z = -0.3;
      group.add(check);
    } else if (processType !== 'idle' && processType !== 'unknown') {
      // Default: small cap
      const capGeo = new THREE.BoxGeometry(0.4, 0.1, 0.35);
      const cap = new THREE.Mesh(capGeo, hatMat);
      cap.position.y = 2.18;
      group.add(cap);
    }

    // ---- Arms ----
    const armGeo = new THREE.BoxGeometry(0.18, 0.55, 0.2);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.45, 1.15, 0.1);
    armL.castShadow = true;
    group.add(armL);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.45, 1.15, 0.1);
    armR.castShadow = true;
    group.add(armR);

    // ---- Legs ----
    const legGeo = new THREE.BoxGeometry(0.22, 0.5, 0.25);
    const legL = new THREE.Mesh(legGeo, accentMat);
    legL.position.set(-0.16, 0.55, 0);
    legL.castShadow = true;
    group.add(legL);
    const legR = new THREE.Mesh(legGeo, accentMat);
    legR.position.set(0.16, 0.55, 0);
    legR.castShadow = true;
    group.add(legR);

    return { group, head, torso, armL, armR, legL, legR, eyeL: pupilL, eyeR: pupilR };
  }

  _buildDeskFallback() {
    // Procedural box-geometry desk (used when GLB not loaded yet)
    const group = new THREE.Group();
    const woodMat = this._makeWoodMaterial();
    const legMat = new THREE.MeshStandardMaterial({ color: C.surface0, roughness: 0.8 });

    const topGeo = new THREE.BoxGeometry(2.0, 0.08, 1.2);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.85;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const dlGeo = new THREE.BoxGeometry(0.08, 0.85, 0.08);
    [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(dlGeo, legMat);
      leg.position.set(x, 0.425, z);
      leg.castShadow = true;
      group.add(leg);
    });
    return group;
  }

  _buildDeskFromModel() {
    // Clone the loaded GLB desk and enable shadows
    const clone = this._cloneModel(MODEL_PATHS.desk);
    if (!clone) return null;

    const woodMat = this._makeWoodMaterial();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Apply wood grain to the desk top surface
        if (child.name === 'top_surface') {
          child.material.dispose();
          child.material = woodMat;
        }
      }
    });

    return clone;
  }

  _buildDesk(processType) {
    const palette = CHAR_PALETTE[processType] || CHAR_PALETTE.unknown;
    const group = new THREE.Group();

    // Desk — try GLB model, fallback to procedural
    const deskModel = this._buildDeskFromModel();
    let usingModel = false;
    if (deskModel) {
      deskModel.userData._isDeskModel = true;
      group.add(deskModel);
      usingModel = true;
    } else {
      const fallback = this._buildDeskFallback();
      fallback.userData._isFallbackDesk = true;
      group.add(fallback);
    }

    // Chair (still procedural — no model yet)
    const chairMat = new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.6, metalness: 0.1 });
    const legMat = new THREE.MeshStandardMaterial({ color: C.surface0, roughness: 0.8 });

    const chairSeatGeo = new THREE.BoxGeometry(0.55, 0.06, 0.5);
    const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
    chairSeat.position.set(0, 0.6, 0.9);
    chairSeat.castShadow = true;
    group.add(chairSeat);

    const chairBackGeo = new THREE.BoxGeometry(0.55, 0.6, 0.06);
    const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
    chairBack.position.set(0, 0.92, 1.12);
    chairBack.castShadow = true;
    group.add(chairBack);

    const clGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
    [[-0.2, 0.7], [0.2, 0.7], [-0.2, 1.08], [0.2, 1.08]].forEach(([x, z]) => {
      const cl = new THREE.Mesh(clGeo, legMat);
      cl.position.set(x, 0.3, z);
      group.add(cl);
    });

    // Monitor (still procedural — no model yet)
    const monGroup = new THREE.Group();
    const monGeo = new THREE.BoxGeometry(0.9, 0.6, 0.06);
    const monMat = new THREE.MeshStandardMaterial({ color: C.surface0, roughness: 0.4, metalness: 0.2 });
    const mon = new THREE.Mesh(monGeo, monMat);
    mon.position.y = 0.3;
    mon.castShadow = true;
    monGroup.add(mon);

    // Screen (emissive canvas texture)
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256;
    screenCanvas.height = 160;
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    screenTex.minFilter = THREE.LinearFilter;
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });
    const screenGeo = new THREE.PlaneGeometry(0.8, 0.5);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.3, 0.035);
    monGroup.add(screen);

    // Monitor stand
    const standGeo = new THREE.BoxGeometry(0.08, 0.15, 0.06);
    const stand = new THREE.Mesh(standGeo, monMat);
    stand.position.y = -0.08;
    monGroup.add(stand);
    const baseGeo = new THREE.BoxGeometry(0.35, 0.03, 0.2);
    const base = new THREE.Mesh(baseGeo, monMat);
    base.position.y = -0.16;
    monGroup.add(base);

    monGroup.position.set(0, 1.05, -0.3);
    group.add(monGroup);

    // Keyboard (still procedural)
    const kbGeo = new THREE.BoxGeometry(0.6, 0.025, 0.25);
    const kbMat = new THREE.MeshStandardMaterial({ color: C.surface1, roughness: 0.6 });
    const kb = new THREE.Mesh(kbGeo, kbMat);
    kb.position.set(0, 0.9, 0.2);
    kb.castShadow = true;
    group.add(kb);

    return { group, monGroup, screenCanvas, screenTex, screen, _usingModel: usingModel };
  }

  _drawScreen(screenCanvas, processType, isWorking, time) {
    const ctx = screenCanvas.getContext('2d');
    const w = screenCanvas.width;
    const h = screenCanvas.height;

    // Background
    ctx.fillStyle = processType === 'powershell' ? '#012456' : '#1e1e2e';
    ctx.fillRect(0, 0, w, h);

    if (!isWorking) {
      // Screen saver — dim
      ctx.fillStyle = '#313244';
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('zzz', w / 2, h / 2 + 6);
      return;
    }

    const text = SCREEN_TEXT[processType] || SCREEN_TEXT.unknown;
    const lines = text.split('\n');

    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    const colors = ['#a6e3a1', '#89b4fa', '#f9e2af', '#cdd6f4', '#f38ba8'];

    lines.forEach((line, i) => {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(line, 14, 30 + i * 22);
    });

    // Blinking cursor
    if (Math.floor(time * 2) % 2 === 0) {
      const lastLine = lines[lines.length - 1] || '';
      const cx = 14 + ctx.measureText(lastLine).width + 4;
      ctx.fillStyle = '#f5e0dc';
      ctx.fillRect(cx, 30 + (lines.length - 1) * 22 - 14, 8, 16);
    }
  }

  addAgent(tabId, tabLabel, processType, isWorking, locked) {
    if (this.agents.has(tabId)) {
      this.updateAgent(tabId, tabLabel, processType, isWorking, locked);
      return;
    }

    const index = this.agents.size;
    const pos = deskPosition(index);

    // Build desk + character
    const desk = this._buildDesk(processType);
    const char = this._buildCharacter(processType);

    // Position character behind desk (sitting)
    char.group.position.set(0, 0, 0.85);

    // Nameplate (floating text sprite)
    const nameSprite = this._makeTextSprite(tabLabel, processType);
    nameSprite.position.set(0, 2.6, 0.4);

    const agentGroup = new THREE.Group();
    agentGroup.add(desk.group);
    agentGroup.add(char.group);
    agentGroup.add(nameSprite);
    agentGroup.position.set(pos.x, 0, pos.z);

    this.scene.add(agentGroup);

    this.agents.set(tabId, {
      group: agentGroup,
      desk,
      char,
      nameSprite,
      processType,
      isWorking,
      locked,
      label: tabLabel,
      index,
      animOffset: Math.random() * Math.PI * 2,
    });

    this._drawScreen(desk.screenCanvas, processType, isWorking, 0);
    desk.screenTex.needsUpdate = true;

    // Re-center camera on the group
    this._focusCamera();
  }

  updateAgent(tabId, tabLabel, processType, isWorking, locked) {
    const agent = this.agents.get(tabId);
    if (!agent) return;

    const changed = agent.processType !== processType || agent.isWorking !== isWorking;
    agent.processType = processType;
    agent.isWorking = isWorking;
    agent.locked = locked;
    agent.label = tabLabel;

    if (changed) {
      // Dispose old character geometry/materials, then rebuild
      const oldChar = agent.char.group;
      oldChar.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      agent.group.remove(oldChar);
      const pos = oldChar.position.clone();
      agent.char = this._buildCharacter(processType);
      agent.char.group.position.copy(pos);
      agent.group.add(agent.char.group);

      // Update screen
      this._drawScreen(agent.desk.screenCanvas, processType, isWorking, 0);
      agent.desk.screenTex.needsUpdate = true;

    }

    // Update name sprite (dispose old texture/material)
    if (agent.nameSprite) {
      agent.nameSprite.material.map?.dispose();
      agent.nameSprite.material.dispose();
      agent.group.remove(agent.nameSprite);
    }
    agent.nameSprite = this._makeTextSprite(tabLabel, processType);
    agent.nameSprite.position.set(0, 2.6, 0.4);
    agent.group.add(agent.nameSprite);
  }

  removeAgent(tabId) {
    const agent = this.agents.get(tabId);
    if (!agent) return;
    this.scene.remove(agent.group);
    // Dispose geometries/materials/lights
    agent.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
      if (child.isLight && child.dispose) child.dispose();
    });
    this.agents.delete(tabId);
    this._repositionAll();
    this._focusCamera();
  }

  _repositionAll() {
    let i = 0;
    for (const [, agent] of this.agents) {
      agent.index = i;
      const pos = deskPosition(i);
      agent.group.position.set(pos.x, 0, pos.z);
      i++;
    }
  }

  _focusCamera() {
    if (this.agents.size === 0) {
      this.controls.target.set(0, 1, 0);
      return;
    }
    let cx = 0, cz = 0;
    for (const [, agent] of this.agents) {
      cx += agent.group.position.x;
      cz += agent.group.position.z;
    }
    cx /= this.agents.size;
    cz /= this.agents.size;
    this.controls.target.set(cx, 1, cz);
  }

  highlightAgent(tabId) {
    for (const [id, agent] of this.agents) {
      const highlighted = id === tabId;
      agent.group.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
          if (highlighted) {
            child.material.emissiveIntensity = 0.15;
            child.material.emissive.setHex(C.blue);
          } else {
            child.material.emissiveIntensity = 0;
            child.material.emissive.setHex(0x000000);
          }
        }
      });
      // Don't reset the screen emissive
      if (agent.desk.screen.material.emissiveMap) {
        agent.desk.screen.material.emissiveIntensity = 0.4;
        agent.desk.screen.material.emissive.setHex(0xffffff);
      }
    }
  }

  clearHighlight() {
    for (const [, agent] of this.agents) {
      agent.group.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
          child.material.emissiveIntensity = 0;
          child.material.emissive.setHex(0x000000);
        }
      });
      if (agent.desk.screen.material.emissiveMap) {
        agent.desk.screen.material.emissiveIntensity = 0.4;
        agent.desk.screen.material.emissive.setHex(0xffffff);
      }
    }
  }

  _makeTextSprite(text, processType) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(30, 30, 46, 0.85)';
    const r = 8;
    const w = canvas.width, h = canvas.height;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Accent border
    const palette = CHAR_PALETTE[processType] || CHAR_PALETTE.unknown;
    ctx.strokeStyle = '#' + palette.body.toString(16).padStart(6, '0');
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#cdd6f4';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Truncate
    let display = text;
    if (ctx.measureText(display).width > w - 20) {
      while (ctx.measureText(display + '...').width > w - 20 && display.length > 0) {
        display = display.slice(0, -1);
      }
      display += '...';
    }
    ctx.fillText(display, w / 2, h / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
  }

  /* ---- Animation loop ---- */
  _animate() {
    if (this._disposed) return;
    this._animFrame = requestAnimationFrame(() => this._animate());

    // Use performance.now() directly to avoid THREE.Clock getDelta/getElapsedTime conflicts
    const t = (performance.now() - this._startTime) / 1000;

    for (const [, agent] of this.agents) {
      const off = agent.animOffset;
      const char = agent.char;

      if (agent.isWorking) {
        // Typing: subtle arm movement
        char.armL.rotation.x = Math.sin(t * 6 + off) * 0.15 - 0.3;
        char.armR.rotation.x = Math.sin(t * 6 + off + Math.PI) * 0.15 - 0.3;
        // Head bob
        char.head.rotation.z = Math.sin(t * 1.5 + off) * 0.05;
        char.head.position.y = 1.87 + Math.sin(t * 2 + off) * 0.015;
        // Body sway
        char.torso.rotation.z = Math.sin(t * 1.2 + off) * 0.02;
      } else {
        // Resting: leaning back, slow breathing
        char.torso.rotation.x = Math.sin(t * 0.5 + off) * 0.03 + 0.05;
        char.head.rotation.x = Math.sin(t * 0.3 + off) * 0.04 + 0.08;
        char.head.position.y = 1.87 + Math.sin(t * 0.5 + off) * 0.02;
        char.armL.rotation.x = -0.1;
        char.armR.rotation.x = -0.1;
        char.armL.rotation.z = 0.15;
        char.armR.rotation.z = -0.15;
      }

      // Occasional eye blink
      const blinkCycle = (t + off * 3) % 4;
      const eyeScale = (blinkCycle > 3.8 && blinkCycle < 3.95) ? 0.1 : 1;
      char.eyeL.scale.y = eyeScale;
      char.eyeR.scale.y = eyeScale;

      // Floating nameplate bob
      agent.nameSprite.position.y = 2.6 + Math.sin(t * 1.2 + off) * 0.05;

    }

    // Update screens at ~2Hz (outside per-agent loop)
    if (t - this._lastScreenUpdate > 0.5) {
      this._lastScreenUpdate = t;
      for (const [, agent] of this.agents) {
        this._drawScreen(agent.desk.screenCanvas, agent.processType, agent.isWorking, t);
        agent.desk.screenTex.needsUpdate = true;
      }
    }

    // Update cursor hover
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let hovering = false;
    for (const [tabId, agent] of this.agents) {
      const meshes = [];
      agent.group.traverse((child) => { if (child.isMesh) meshes.push(child); });
      const hits = this.raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) { hovering = true; break; }
    }
    this.renderer.domElement.style.cursor = hovering ? 'pointer' : 'grab';

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /* ---- Resize ---- */
  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /* ---- API ---- */
  onClick(cb) { this._onClickCb = cb; }

  syncAgents(tabsMap) {
    // tabsMap: Map<tabId, { label, detectedProcess, locked }>
    const current = new Set(this.agents.keys());
    const incoming = new Set(tabsMap.keys());

    // Remove agents that no longer exist
    for (const tabId of current) {
      if (!incoming.has(tabId)) this.removeAgent(tabId);
    }

    // Add or update
    for (const [tabId, tab] of tabsMap) {
      const proc = tab.detectedProcess || 'idle';
      const isWorking = proc !== 'idle';
      this.addAgent(tabId, tab.label, proc, isWorking, tab.locked);
    }
  }

  dispose() {
    this._disposed = true;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this._resizeObserver?.disconnect();
    this.controls?.dispose();

    // Dispose all
    this.scene.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        } else {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
      if (child.isLight && child.dispose) child.dispose();
    });

    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

// Expose to global scope for renderer.js
window.Playground3D = Playground3D;
