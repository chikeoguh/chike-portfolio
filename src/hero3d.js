/*
  The hero's 3D stage: a laptop showing the sites Chike runs and a phone showing the Buk Business app,
  lit like a studio render. Built with three.js, bundled to public/assets/hero3d.js (npm run build:3d).

  mount(stage, { sites, apps, reduced, poster }) draws into a canvas inside .hero__stage and returns
  { ready, pause, resume, destroy }. The page keeps its poster image under the canvas until ready
  resolves, and keeps it for good if WebGL fails.

  Motion budget: assembles once on load (1.2 s), then a slow sway, the pointer's lean, a drag to turn
  it, and one screen change every 4 s on both screens together (the page's one timed loop, with a pause
  button). Reduced motion: the finished picture, drawn once.
*/
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  MeshBasicMaterial, ShaderMaterial, PlaneGeometry, ShapeGeometry, ExtrudeGeometry, Shape, CanvasTexture,
  Texture, DirectionalLight, PMREMGenerator, SRGBColorSpace, ACESFilmicToneMapping, AdditiveBlending,
  MixOperation, Vector3, Box3, MathUtils,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CYCLE_MS = 4000;
const FADE_MS = 700;
const INTRO_MS = 1200;
const MAX_DPR = 1.5;
const FOV = 26;
const ELEVATION = 0.17;

const LAPTOP = { w: 31.3, d: 22.1, h: 0.72, lidH: 21.2, lidT: 0.5, screenW: 29.2, screenH: 18.25, open: -0.3, closed: 1.45 };
const PHONE = { w: 7.15, h: 14.7, depth: 0.56, bevel: 0.12, glassW: 6.98, glassH: 14.52, screenW: 6.64, screenH: 14.2, lift: 1.1 };

const lerp = MathUtils.lerp;
const clamp01 = t => Math.min(1, Math.max(0, t));
const easeOut = t => 1 - (1 - t) ** 3;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function roundedRect(w, h, r) {
  const s = new Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// a flat rounded rectangle whose UVs run 0..1 across its box, so a picture fills it
function roundedPlane(w, h, r) {
  const g = new ShapeGeometry(roundedRect(w, h, r), 16);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return g;
}

// two pictures and a mix between them: a screen that cross-fades to its next picture
function screenMaterial() {
  return new ShaderMaterial({
    uniforms: { tA: { value: null }, tB: { value: null }, k: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tA; uniform sampler2D tB; uniform float k; varying vec2 vUv;\n'
      + 'void main() { vec4 c = mix(texture2D(tA, vUv), texture2D(tB, vUv), k); gl_FragColor = vec4(c.rgb, 1.0);\n#include <colorspace_fragment>\n}',
    toneMapped: false,
  });
}

// a glass layer: unlit and additive, so only a faint reflection of the room shows over the screen
// (a lit material would add the lights' highlights too and wash the screen out)
const glass = (env, reflectivity) => new MeshBasicMaterial({
  color: 0x000000, envMap: env.map, combine: MixOperation, reflectivity,
  transparent: true, blending: AdditiveBlending, depthWrite: false,
});

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

// the deck: the keyboard well, the keys and the trackpad, painted once
function deckTexture() {
  return canvas(1024, 716, (g, W, H) => {
    g.fillStyle = '#26231f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#161412'; roundRect(g, W * 0.07, H * 0.07, W * 0.86, H * 0.5, 14);
    const rows = [{ n: 14, h: 0.045 }, { n: 14, h: 0.075 }, { n: 14, h: 0.075 }, { n: 13, h: 0.075 }, { n: 12, h: 0.075 }, { n: 9, h: 0.075 }];
    let y = H * 0.09;
    for (const row of rows) {
      const x0 = W * 0.085, span = W * 0.83, gap = W * 0.006, kw = (span - gap * (row.n - 1)) / row.n;
      g.fillStyle = '#2f2c28';
      for (let i = 0; i < row.n; i++) roundRect(g, x0 + i * (kw + gap), y, kw, H * row.h, 6);
      y += H * row.h + H * 0.008;
    }
    g.fillStyle = '#2c2925'; roundRect(g, W * 0.31, H * 0.62, W * 0.38, H * 0.33, 16);
  });
}

function glowTexture(stops) {
  return canvas(256, 256, (g, W, H) => {
    const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    stops.forEach(([at, col]) => r.addColorStop(at, col));
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  });
}

function loadImage(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img.decode().then(() => img);
}

// a phone screenshot under a status bar and the island, sized to the phone's screen
function phoneScreen(img) {
  const W = 660, H = Math.round(W * PHONE.screenH / PHONE.screenW);
  return canvas(W, H, (g) => {
    g.drawImage(img, 2, 2, 1, 1, 0, 0, W, H);
    const top = Math.max(0, Math.round(H - W * img.naturalHeight / img.naturalWidth));
    g.drawImage(img, 0, top, W, H - top);
    g.fillStyle = '#111';
    g.font = '600 25px -apple-system, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';
    g.textBaseline = 'middle';
    const mid = Math.max(34, top / 2 + 2);
    g.fillText('9:41', 62, mid);
    g.fillStyle = '#000'; roundRect(g, W / 2 - 96, mid - 26, 192, 52, 26);
    g.fillStyle = '#111';
    for (let i = 0; i < 4; i++) roundRect(g, W - 168 + i * 9, mid + 8 - (i + 1) * 4.5, 6, (i + 1) * 4.5, 1.5);
    g.beginPath(); g.arc(W - 112, mid + 8, 13, -2.35, -0.79); g.lineTo(W - 112, mid + 8); g.fill();
    g.globalAlpha = 0.45; roundRect(g, W - 92, mid - 9, 40, 18, 5); g.globalAlpha = 1;
    roundRect(g, W - 90, mid - 7, 33, 14, 3.5);
  });
}

function buildLaptop(env) {
  const metal = new MeshPhysicalMaterial({ color: 0x24211e, metalness: 0.78, roughness: 0.33, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const laptop = new Group();
  const base = new Mesh(new RoundedBoxGeometry(LAPTOP.w, LAPTOP.h, LAPTOP.d, 4, 0.34), metal);
  base.position.y = LAPTOP.h / 2;
  laptop.add(base);

  const deckMap = new CanvasTexture(deckTexture());
  deckMap.colorSpace = SRGBColorSpace;
  deckMap.anisotropy = env.anisotropy;
  const deck = new Mesh(new PlaneGeometry(LAPTOP.w - 0.7, LAPTOP.d - 0.7), new MeshStandardMaterial({ map: deckMap, metalness: 0.45, roughness: 0.52 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = LAPTOP.h + 0.003;
  laptop.add(deck);

  const hinge = new Group();
  hinge.position.set(0, LAPTOP.h, -LAPTOP.d / 2 + 0.25);
  laptop.add(hinge);
  const lid = new Mesh(new RoundedBoxGeometry(LAPTOP.w, LAPTOP.lidH, LAPTOP.lidT, 4, 0.22), metal);
  lid.position.y = LAPTOP.lidH / 2;
  hinge.add(lid);

  const face = LAPTOP.lidT / 2;
  const bezel = new Mesh(roundedPlane(LAPTOP.w - 0.35, LAPTOP.lidH - 0.35, 0.55), new MeshBasicMaterial({ color: 0x060606 }));
  bezel.position.set(0, LAPTOP.lidH / 2, face + 0.004);
  hinge.add(bezel);

  const screen = new Mesh(roundedPlane(LAPTOP.screenW, LAPTOP.screenH, 0.32), screenMaterial());
  screen.position.set(0, LAPTOP.lidH / 2 + 0.42, face + 0.008);
  hinge.add(screen);

  const sheen = new Mesh(roundedPlane(LAPTOP.w - 0.35, LAPTOP.lidH - 0.35, 0.55), glass(env, 0.035));
  sheen.position.set(0, LAPTOP.lidH / 2, face + 0.014);
  hinge.add(sheen);

  return { laptop, hinge, screen };
}

function buildPhone(env) {
  const phone = new Group();
  const body = new ExtrudeGeometry(roundedRect(PHONE.w - 0.2, PHONE.h - 0.2, 1.0), {
    depth: PHONE.depth, bevelEnabled: true, bevelThickness: PHONE.bevel, bevelSize: 0.1, bevelSegments: 4, curveSegments: 18,
  });
  body.translate(0, 0, -PHONE.depth / 2);
  const titanium = new MeshPhysicalMaterial({ color: 0xb3a38c, metalness: 0.92, roughness: 0.28, clearcoat: 0.3 });
  phone.add(new Mesh(body, titanium));

  const front = PHONE.depth / 2 + PHONE.bevel;
  const glassBlack = new Mesh(roundedPlane(PHONE.glassW, PHONE.glassH, 1.02), new MeshBasicMaterial({ color: 0x040404 }));
  glassBlack.position.z = front + 0.002;
  phone.add(glassBlack);

  const screen = new Mesh(roundedPlane(PHONE.screenW, PHONE.screenH, 0.86), screenMaterial());
  screen.position.z = front + 0.005;
  phone.add(screen);

  const sheen = new Mesh(roundedPlane(PHONE.glassW, PHONE.glassH, 1.02), glass(env, 0.06));
  sheen.position.z = front + 0.01;
  phone.add(sheen);

  const key = (x, y, h) => {
    const b = new Mesh(new RoundedBoxGeometry(0.16, h, 0.3, 2, 0.06), titanium);
    b.position.set(x, y, 0);
    phone.add(b);
  };
  key(-PHONE.w / 2 - 0.04, 3.9, 0.7);
  key(-PHONE.w / 2 - 0.04, 2.6, 1.2);
  key(-PHONE.w / 2 - 0.04, 1.1, 1.2);
  key(PHONE.w / 2 + 0.04, 2.4, 1.9);
  return { phone, screen };
}

function floor(env) {
  const g = new Group();
  const plane = (w, d, tex, opts) => {
    const t = new CanvasTexture(tex);
    t.colorSpace = SRGBColorSpace;
    const m = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, ...opts }));
    m.rotation.x = -Math.PI / 2;
    return m;
  };
  const glow = plane(90, 52, glowTexture([[0, 'rgba(201,164,90,.34)'], [0.45, 'rgba(201,164,90,.10)'], [1, 'rgba(201,164,90,0)']]), { blending: AdditiveBlending });
  glow.position.y = 0.005;
  const shade = glowTexture([[0, 'rgba(0,0,0,.78)'], [0.6, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]);
  const under = plane(40, 29, shade);
  under.position.y = 0.01;
  const phoneShade = plane(10, 4.2, shade, { opacity: 0.9 });
  phoneShade.position.y = 0.012;
  g.add(glow, under, phoneShade);
  env.shades = { under, phoneShade };
  return g;
}

export function mount(stage, opts = {}) {
  const reduced = !!opts.reduced;
  const cv = document.createElement('canvas');
  cv.className = 'stage3d';
  cv.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.poster });
  renderer.setClearColor(0x000000, 0);
  // a GPU that rejects a shader draws nothing: note it, so the page keeps its poster instead of an empty stage
  // (window.__ccglFail is the design checker's switch for a strict GPU)
  let shaderFailed = !!window.__ccglFail;
  renderer.debug.onShaderError = () => { shaderFailed = true; };
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const env = { anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) };

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = env.map = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();

  const key = new DirectionalLight(0xffe4bf, 1.7); key.position.set(-22, 30, 26);
  const rim = new DirectionalLight(0xd8b26a, 2.4); rim.position.set(26, 14, -30);
  const fill = new DirectionalLight(0x9fb3cc, 0.45); fill.position.set(12, 6, 30);
  scene.add(key, rim, fill);

  const world = new Group();
  scene.add(world);
  const devices = new Group();
  world.add(devices);
  const { laptop, hinge, screen: lapScreen } = buildLaptop(env);
  const { phone, screen: phoneScreenMesh } = buildPhone(env);
  devices.add(laptop, phone);
  world.add(floor(env));

  const camera = new PerspectiveCamera(FOV, 1, 1, 400);
  const target = new Vector3();
  let aspect = 1, phoneBase = { x: 16, z: 6, yaw: -0.28 };

  // the composition follows the stage's shape: wide, the phone stands right of the laptop; narrow
  // (a phone's stage), it steps in front of the laptop's right corner so both stay large
  function arrange() {
    const t = smooth(0.9, 1.9, aspect);
    laptop.position.set(lerp(-3.6, -4.6, t), 0, 0);
    phoneBase = { x: lerp(10.4, 15.6, t), z: lerp(9.5, 7, t), yaw: lerp(-0.2, -0.32, t) };
    phone.position.set(phoneBase.x, PHONE.h / 2 + PHONE.lift, phoneBase.z);
    phone.rotation.set(-0.04, phoneBase.yaw, 0);
    env.shades.under.position.x = laptop.position.x;
    env.shades.phoneShade.position.set(phoneBase.x, 0.012, phoneBase.z);
    hinge.rotation.x = LAPTOP.open;
    world.rotation.set(0, 0, 0);
    world.updateMatrixWorld(true);
    fit();
  }

  // the camera backs off until the devices fill the stage with an even margin
  function fit() {
    const box = new Box3().setFromObject(devices);
    box.getCenter(target);
    const dir = new Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
    const corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z));
    const v = new Vector3();
    const spread = d => {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      let sx = 0, sy = 0;
      for (const c of corners) { v.copy(c).project(camera); sx = Math.max(sx, Math.abs(v.x)); sy = Math.max(sy, Math.abs(v.y)); }
      return Math.max(sx / 0.92, sy / 0.9);
    };
    let lo = 10, hi = 400;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (spread(mid) > 1) lo = mid; else hi = mid; }
    spread(hi);
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    aspect = r.width / r.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.setSize(r.width, r.height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    arrange();
    wake();
  }

  // screens: the sites on the laptop, the app on the phone, one change for both every CYCLE_MS
  const sites = (opts.sites || []).map(src => ({ src, tex: null }));
  const apps = (opts.apps || []).map(src => ({ src, tex: null }));
  const texFrom = (source) => {
    const t = source instanceof HTMLCanvasElement ? new CanvasTexture(source) : new Texture(source);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = env.anisotropy;
    t.needsUpdate = true;
    return t;
  };
  const load = (item, isPhone) => item.tex ? Promise.resolve(item.tex)
    : loadImage(item.src).then(img => (item.tex = texFrom(isPhone ? phoneScreen(img) : img)));

  let shown = 0;
  const setScreens = (i, k) => {
    const a = sites[i % sites.length], b = sites[(i + 1) % sites.length];
    const pa = apps[i % apps.length], pb = apps[(i + 1) % apps.length];
    const lu = lapScreen.material.uniforms, pu = phoneScreenMesh.material.uniforms;
    lu.tA.value = a.tex; lu.tB.value = (b.tex || a.tex); lu.k.value = b.tex ? k : 0;
    pu.tA.value = pa.tex; pu.tB.value = (pb.tex || pa.tex); pu.k.value = pb.tex ? k : 0;
  };

  // the hotspots follow the screens they point at
  const anchors = [...stage.querySelectorAll('[data-anchor]')].map(el => ({
    el, obj: el.dataset.anchor === 'phone' ? phone : hinge,
    local: el.dataset.anchor === 'phone' ? new Vector3(-1.2, 3.2, 0.6) : new Vector3(-LAPTOP.screenW * 0.2, LAPTOP.lidH * 0.66, LAPTOP.lidT),
  }));
  const p = new Vector3();
  const pct = v => (Math.min(96, Math.max(4, v))).toFixed(2) + '%';
  function placeSpots() {
    for (const a of anchors) {
      p.copy(a.local); a.obj.localToWorld(p); p.project(camera);
      a.el.style.setProperty('--x', pct((p.x + 1) * 50));
      a.el.style.setProperty('--y', pct((1 - p.y) * 50));
    }
  }

  // input: a lean toward a fine pointer, a drag that turns the pair and springs back
  const look = { x: 0, y: 0, tx: 0, ty: 0, drag: 0, dragTo: 0 };
  const fine = matchMedia('(pointer: fine)').matches;
  const onMove = e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    look.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    look.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    wake();
  };
  let dragFrom = null;
  const onDown = e => { dragFrom = { x: e.clientX, d: look.dragTo }; wake(); };
  const onDrag = e => {
    if (!dragFrom) return;
    const r = stage.getBoundingClientRect();
    look.dragTo = Math.max(-0.7, Math.min(0.7, dragFrom.d + (e.clientX - dragFrom.x) / r.width * 1.6));
    wake();
  };
  const onUp = () => { dragFrom = null; look.dragTo = 0; wake(); };
  if (!reduced) {
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    cv.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onDrag, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  let raf = 0, last = 0, life = 0, start = 0, paused = false, visible = true, alive = true, skip = false;
  function settled() {
    return Math.abs(look.x - look.tx) < 1e-3 && Math.abs(look.y - look.ty) < 1e-3 && Math.abs(look.drag - look.dragTo) < 1e-3 && !dragFrom;
  }
  function wake() { if (alive && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

  function pose(now) {
    const intro = reduced || opts.poster ? 1 : easeOut(clamp01((now - start) / INTRO_MS));
    hinge.rotation.x = lerp(LAPTOP.closed, LAPTOP.open, intro);
    const bob = reduced ? 0 : Math.sin(life / 6000 * Math.PI * 2) * 0.16;
    phone.position.y = lerp(-PHONE.h, PHONE.h / 2 + PHONE.lift, intro) + bob;
    phone.rotation.y = phoneBase.yaw + (1 - intro) * 0.5;
    const ease = 0.08;
    look.x += (look.tx - look.x) * ease; look.y += (look.ty - look.y) * ease;
    look.drag += (look.dragTo - look.drag) * (dragFrom ? 0.35 : 0.08);
    const sway = reduced ? 0 : Math.sin(life / 14000 * Math.PI * 2) * 0.05;
    world.rotation.y = (1 - intro) * -0.32 + sway + look.x * 0.13 + look.drag;
    world.rotation.x = look.y * 0.035;
    return intro;
  }

  function frame(now) {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(50, last ? now - last : 16);
    last = now;
    if (!paused) life += dt;
    const intro = pose(now);
    // the hotspots wait until the pair has assembled, so a disc never rides a moving phone
    if ((intro < 1) !== stage.classList.contains('is-intro')) stage.classList.toggle('is-intro', intro < 1);
    const turn = Math.floor(life / CYCLE_MS);
    const into = life - turn * CYCLE_MS;
    if (turn !== shown) { shown = turn; prefetch(turn + 1); }
    setScreens(shown, reduced ? 0 : clamp01((into - (CYCLE_MS - FADE_MS)) / FADE_MS));
    // idle sway draws at 30 fps; the intro, a drag and the pointer's lean at the full rate
    skip = !skip;
    const busy = intro < 1 || !settled();
    const still = reduced || (paused && !busy) || !visible;
    if (busy || still || !skip) { renderer.render(scene, camera); placeSpots(); }
    if (still) { last = 0; return; }
    raf = requestAnimationFrame(frame);
  }

  function prefetch(i) {
    const s = sites[i % sites.length], a = apps[i % apps.length];
    if (s && !s.tex) load(s, false).catch(() => {});
    if (a && !a.tex) load(a, true).catch(() => {});
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); });
  const onVis = () => { if (!document.hidden) { last = 0; wake(); } };
  const ro = new ResizeObserver(resize);

  const ready = Promise.all([load(sites[0], false), load(apps[0], true)]).then(() => {
    if (!alive) return;
    stage.appendChild(cv);
    resize();
    setScreens(0, 0);
    start = performance.now();
    renderer.render(scene, camera);
    if (shaderFailed) { destroy(); throw new Error('a shader did not compile; the poster stays'); }
    prefetch(1);
    io.observe(stage);
    ro.observe(stage);
    document.addEventListener('visibilitychange', onVis);
    placeSpots();
    wake();
  });

  cv.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    destroy();
    stage.classList.remove('is-live', 'is-intro');
    stage.querySelectorAll('.poster').forEach(p => { p.hidden = false; });
  });

  function destroy() {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointermove', onDrag);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    renderer.dispose();
    cv.remove();
  }

  return {
    ready,
    pause() { paused = true; },
    resume() { paused = false; last = 0; wake(); },
    get paused() { return paused; },
    destroy,
  };
}
