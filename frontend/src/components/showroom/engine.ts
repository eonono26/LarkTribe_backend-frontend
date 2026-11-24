import * as THREE from "three";

/* ------------------------------------------------------------------ types */
export interface ShowItem { id: number; slug: string; name: string; priceLabel: string; imageUrl: string; backUrl?: string }
export interface ShowBay { title: string; items: ShowItem[] }
export interface ShowWing { title: string; subtitle: string; accent: number; bays: ShowBay[] }
export interface EngineCallbacks {
  onSelect: (id: number) => void;
  onLocation: (wing: number, bay: number) => void;
  onHover: (id: number | null, x: number, y: number) => void;
  onProgress: (loaded: number, total: number) => void;
}
export type InspectView = "front" | "right" | "back" | "left" | "top";

/* -------------------------------------------------------------- constants */
const HALL_W = 16;
const HALL_H = 5.2;
const EYE = 1.6;
const SLOT = 3.6;            // length (z) of one category bay
const GATE = 6;              // lead-in before the first bay of a wing
const AISLE_HALF = 4.2;      // walkable half-width
const DISPLAY_X = 2.8; // category markers float above freestanding island displays
const ITEM_H = 2.1;
const LAYERS = 6;
const DEPTH = 0.055;

const proxied = (url: string) => `/api/showroom-img?u=${encodeURIComponent(url)}`;
const proxiedAsset = (url: string) => `/api/showroom-asset?u=${encodeURIComponent(url)}`;

/* ---------------------------------------------------------- canvas helpers */
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function floorTexture() {
  const t = canvasTex(1024, 1024, (g) => {
    g.fillStyle = "#d9d4cb"; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = 214 + Math.random() * 14;
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(i * 256 + 2, j * 256 + 2, 252, 252);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function signTex(text: string, o: { w?: number; h?: number; size?: number; fg?: string; bg?: string | null; spacing?: number; weight?: number } = {}) {
  const { w = 1024, h = 256, size = 120, fg = "#fff", bg = null, spacing = 18, weight = 300 } = o;
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg; g.font = `${weight} ${size}px "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    g.fillText(text, w / 2 + spacing / 2, h / 2);
  });
}
/** Cut the studio background out of a product photo: flood-fill from the borders over
 *  pixels close to the corner colour, so white garments on white stay solid inside. */
function cutout(img: HTMLImageElement) {
  const max = 420, k = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(2, Math.round(img.width * k)), h = Math.max(2, Math.round(img.height * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h), d = data.data;
  const px = (x: number, y: number) => (y * w + x) * 4;
  // already transparent?
  let hasAlpha = false; for (let i = 3; i < d.length; i += 4 * 17) if (d[i] < 250) { hasAlpha = true; break; }
  if (!hasAlpha) {
    const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
    const bg = [0, 1, 2].map((ch) => corners.reduce((s, p) => s + d[p + ch], 0) / 4);
    const near = (p: number) => Math.abs(d[p] - bg[0]) + Math.abs(d[p + 1] - bg[1]) + Math.abs(d[p + 2] - bg[2]) < 54;
    const seen = new Uint8Array(w * h); const stack: number[] = [];
    const push = (x: number, y: number) => { const i = y * w + x; if (!seen[i] && near(i * 4)) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i / w) | 0;
      if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
    }
    // only trust the cut if it removed a sensible amount (not the whole image / nothing)
    let cut = 0; for (let i = 0; i < seen.length; i++) cut += seen[i];
    if (cut > w * h * 0.08 && cut < w * h * 0.93) {
      for (let i = 0; i < seen.length; i++) if (seen[i]) d[i * 4 + 3] = 0;
      // soften the edge: pixels touching the cut get partial alpha
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x; if (seen[i]) continue;
        if (seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w]) d[i * 4 + 3] = 150;
      }
    }
    g.putImageData(data, 0, 0);
  } else g.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = proxied(url); });
}

/** A product as a thin 3D slab: front photo, back photo (or mirrored front) and shaded layers between,
 *  so it has real thickness and can be seen from every side. */
function buildSlab(front: THREE.Texture, back: THREE.Texture, aspect: number, height: number, ontop = false) {
  const g = new THREE.Group(); const w = height * Math.min(0.72, Math.max(0.48, aspect));
  const geo = new THREE.PlaneGeometry(w, height);
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < LAYERS; i++) {
    const t = i / (LAYERS - 1), isFront = i < LAYERS / 2;
    const shade = 1;
    const shadeV = i === 0 || i === LAYERS - 1 ? 1 : Math.max(0.55, 0.78 - 0.04 * Math.abs(i - (LAYERS - 1) / 2));
    const m = new THREE.MeshBasicMaterial({ map: isFront ? front : back, alphaTest: 0.5, side: THREE.FrontSide, toneMapped: false, color: new THREE.Color(shadeV, shadeV, shadeV) });
    void shade;
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.z = DEPTH / 2 - t * DEPTH;
    if (!isFront) mesh.rotation.y = Math.PI;
    if (ontop) { m.depthTest = false; mesh.renderOrder = 1000 + i; }
    g.add(mesh); meshes.push(mesh);
  }
  g.userData = { w, h: height };
  return { group: g, meshes };
}

/* ---------------------------------------------------------------- engine */
export function createShowroom(container: HTMLElement, wings: ShowWing[], cb: EngineCallbacks) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  const dom = renderer.domElement; dom.style.display = "block"; dom.style.touchAction = "none";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeae3);
  scene.fog = new THREE.Fog(0xeeeae3, 16, 58);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 140);
  camera.rotation.order = "YXZ"; scene.add(camera);
  const START_Z = 5.5;
  camera.position.set(0, EYE, START_Z);
  let yaw = 0, pitch = 0;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8aea0, 1.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(2, 8, 4); scene.add(sun);

  /* ---- layout pass: where does each wing / bay sit along z? */
  interface BayPos { z: number; side: -1 | 1; bay: ShowBay }
  const wingInfo: { z0: number; z1: number; bays: BayPos[]; slots: { z: number; ws: number; bs: number }[] }[] = [];
  let cursor = -2.5;
  wings.forEach((wing) => {
    const z0 = cursor; const bays: BayPos[] = []; const slots: { z: number; ws: number; bs: number }[] = [];
    wing.bays.forEach((bay, i) => {
      const slot = Math.floor(i / 2); const z = z0 - GATE - slot * SLOT - SLOT / 2;
      bays.push({ z, side: i % 2 === 0 ? -1 : 1, bay });
      if (i % 2 === 0) slots.push({ z, ws: wingInfo.length, bs: i });
    });
    const nSlots = Math.max(1, Math.ceil(wing.bays.length / 2));
    const z1 = z0 - GATE - nSlots * SLOT - 2;
    wingInfo.push({ z0, z1, bays, slots }); cursor = z1;
  });
  const endZ = cursor - 3;
  const hallLen = START_Z + 2.5 - endZ, midZ = (START_Z + 2.5 + endZ) / 2;

  /* ---- shell */
  const ft = floorTexture(); ft.repeat.set(HALL_W / 4, hallLen / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, hallLen), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.35, metalness: 0.08 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, midZ); scene.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.95 });
  const wallGeo = new THREE.PlaneGeometry(hallLen, HALL_H);
  const lw = new THREE.Mesh(wallGeo, wallMat); lw.position.set(-HALL_W / 2, HALL_H / 2, midZ); lw.rotation.y = Math.PI / 2; scene.add(lw);
  const rw = new THREE.Mesh(wallGeo, wallMat); rw.position.set(HALL_W / 2, HALL_H / 2, midZ); rw.rotation.y = -Math.PI / 2; scene.add(rw);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_H), wallMat); bw.position.set(0, HALL_H / 2, endZ); scene.add(bw);
  const fw = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_H), wallMat); fw.position.set(0, HALL_H / 2, START_Z + 2.5); fw.rotation.y = Math.PI; scene.add(fw);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, hallLen), new THREE.MeshStandardMaterial({ color: 0xfaf8f4, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HALL_H, midZ); scene.add(ceil);
  const strip = new THREE.MeshBasicMaterial({ color: 0xfffaf0 });
  [-2.2, 2.2].forEach((x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, hallLen), strip); s.position.set(x, HALL_H - 0.03, midZ); scene.add(s); });
  const brand = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: signTex("LARKTRIBE", { size: 130, spacing: 26, fg: "#222" }), transparent: true }));
  brand.position.set(0, 2.9, endZ + 0.03); scene.add(brand);
  const welcome = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), new THREE.MeshBasicMaterial({ map: signTex("WELCOME", { size: 110, spacing: 22, fg: "#222" }), transparent: true }));
  welcome.position.set(0, 3, START_Z + 2.47); welcome.rotation.y = Math.PI; scene.add(welcome);

  /* ---- fixtures, gates, signs, products */
  const hotspots: THREE.Mesh[] = [];
  const mkHotspot = (x: number, z: number, data: Record<string, number>) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.02, z); ring.userData = data; scene.add(ring); hotspots.push(ring);
  };
  interface Rec { item: ShowItem; wing: number; bay: number; holder: THREE.Group; front?: THREE.Mesh; state: "idle" | "loading" | "ready" | "failed"; textures?: { front: THREE.Texture; back: THREE.Texture; aspect: number }; pos: THREE.Vector3; pick: THREE.Mesh }
  const recs: Rec[] = []; const byId = new Map<number, Rec>();
  let productTotal = 0, done = 0;
  wings.forEach((w) => w.bays.forEach((b) => (productTotal += Math.min(12, b.items.length))));
  // The progress indicator represents the first visible products, not the entire lazy-loaded store.
  const initialLoadTotal = Math.min(12, productTotal);

  wings.forEach((wing, wi) => {
    const info = wingInfo[wi];
    // department gate: pillars + beam + huge name
    const col = new THREE.Color(wing.accent);
    [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, HALL_H, 0.4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })); p.position.set(s * (HALL_W / 2 - 0.5), HALL_H / 2, info.z0 - 1); scene.add(p); });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(HALL_W, 1.5, 0.35), new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }));
    beam.position.set(0, HALL_H - 0.75, info.z0 - 1); scene.add(beam);
    [1, -1].forEach((dir) => {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W - 1, 1.5), new THREE.MeshBasicMaterial({ map: signTex(wing.title.toUpperCase(), { w: 2048, h: 256, size: 150, spacing: 36, fg: "#ffffff", weight: 400 }), transparent: true }));
      t.position.set(0, HALL_H - 0.75, info.z0 - 1 + dir * 0.19); if (dir < 0) t.rotation.y = Math.PI; scene.add(t);
    });
    const sub = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.5), new THREE.MeshBasicMaterial({ map: signTex(wing.subtitle, { w: 1024, h: 96, size: 44, spacing: 10, fg: "#444" }), transparent: true }));
    sub.position.set(0, HALL_H - 1.75, info.z0 - 0.8); scene.add(sub);
    mkHotspot(0, info.z0 - 3.2, { wing: wi, bay: 0 });

    info.bays.forEach(({ z, side, bay }, bi) => {
      const cat = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), new THREE.MeshBasicMaterial({ map: signTex(bay.title.toUpperCase(), { w: 1024, h: 256, size: 100, spacing: 12, fg: "#" + col.getHexString(), weight: 500 }), transparent: true }));
      cat.position.set(side * (DISPLAY_X - 0.04), 4.35, z); cat.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(cat);
      if (bi % 2 === 0) mkHotspot(0, z, { wing: wi, bay: bi });

      // Each garment is an individually selectable open-floor display across the island rows.
      // No wall-mounted product grids or shelf stacks.
      bay.items.slice(0, 12).forEach((item, k) => {
        const row = Math.floor(k / 4);
        const col4 = k % 4;
        const displayX = side * (1.55 + row * 1.05);
        const lz = z + (col4 - 1.5) * 1.08;

        // Open-floor presentation: soft contact shadow instead of a display plinth.
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.72, 40),
          new THREE.MeshBasicMaterial({ color: 0x51483d, transparent: true, opacity: 0.13, depthWrite: false })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(displayX, 0.012, lz);
        shadow.scale.set(1, 0.58, 1);
        scene.add(shadow);

        const holder = new THREE.Group();
        holder.position.set(displayX, 0.16, lz);
        holder.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(holder);

        // Always-visible product name and price, sourced from the catalogue API.
        const labelText = item.name.length > 22 ? item.name.slice(0, 21) + "…" : item.name;
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(1.45, 0.2),
          new THREE.MeshBasicMaterial({
            map: signTex(`${labelText} · ${item.priceLabel}`, {
              w: 1024, h: 144, size: 43, fg: "#29231d", bg: "#fffdf8", spacing: 1, weight: 500
            }),
            transparent: true
          })
        );
        label.position.set(0, ITEM_H + 0.24, 0.31);
        holder.add(label);

        // Clickable placeholder until the real API product photo is loaded.
        const pick = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, ITEM_H),
          new THREE.MeshBasicMaterial({ color: 0xe4e0d8, toneMapped: false, side: THREE.DoubleSide })
        );
        pick.position.y = ITEM_H / 2;
        pick.userData = { item: item.id };
        holder.add(pick);
        const rec: Rec = { item, wing: wi, bay: bi, holder, state: "idle", pos: new THREE.Vector3(), pick };
        holder.getWorldPosition(rec.pos);
        recs.push(rec);
        byId.set(item.id, rec);
      });
    });
  });
  cb.onProgress(0, initialLoadTotal);

  /* ---- lazy photo loading, nearest first */
  let inflight = 0; const MAX_INFLIGHT = 4;
  async function ensureTextures(rec: Rec): Promise<NonNullable<Rec["textures"]>> {
    if (rec.textures) return rec.textures;
    const img = await loadImage(rec.item.imageUrl);
    const f = cutout(img);
    let back: THREE.Texture;
    if (rec.item.backUrl) { try { back = cutout(await loadImage(rec.item.backUrl)).tex; } catch { back = mirrored(f.tex); } } else back = mirrored(f.tex);
    rec.textures = { front: f.tex, back, aspect: f.aspect }; return rec.textures;
  }
  function mirrored(t: THREE.Texture) { const m = t.clone(); m.wrapS = THREE.RepeatWrapping; m.repeat.x = -1; m.offset.x = 1; m.needsUpdate = true; return m; }
  function loadRec(rec: Rec) {
    rec.state = "loading"; inflight++;
    ensureTextures(rec).then((tx) => {
      const { group, meshes } = buildSlab(tx.front, tx.back, tx.aspect, ITEM_H, false);
      group.rotation.x = -0.07; rec.holder.remove(rec.pick); rec.pick.geometry.dispose();
      const hit = new THREE.Mesh(new THREE.PlaneGeometry(group.userData.w, ITEM_H), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = ITEM_H / 2; hit.userData = { item: rec.item.id }; group.position.y = ITEM_H / 2;
      rec.holder.add(group); rec.holder.add(hit); rec.pick = hit; rec.front = meshes[0]; rec.state = "ready";
    }).catch(() => { rec.state = "failed"; }).finally(() => { inflight--; done++; cb.onProgress(Math.min(done, initialLoadTotal), initialLoadTotal); });
  }
  let loadTimer = 0;
  const pump = () => {
    if (inflight >= MAX_INFLIGHT) return;
    let best: Rec | null = null, bd = 1e9;
    for (const r of recs) { if (r.state !== "idle") continue; const d = Math.abs(r.pos.z - camera.position.z) + Math.abs(r.pos.x - camera.position.x) * 0.4; if (d < bd) { bd = d; best = r; } }
    if (best && bd < 34) loadRec(best);
  };
  loadTimer = window.setInterval(pump, 90);

  /* ---- navigation */
  const clampPos = () => {
    camera.position.x = Math.min(AISLE_HALF, Math.max(-AISLE_HALF, camera.position.x));
    camera.position.z = Math.min(START_Z + 1.6, Math.max(endZ + 1.2, camera.position.z));
  };
  let tween: { t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; yf: number; yt: number } | null = null;
  const goTo = (x: number, z: number, lookYaw = 0) => {
    const to = new THREE.Vector3(x, EYE, z);
    const d = ((lookYaw - yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (reduced) { camera.position.copy(to); yaw += d; return; }
    const dist = camera.position.distanceTo(to);
    tween = { t: 0, dur: Math.min(2600, 700 + dist * 40), from: camera.position.clone(), to, yf: yaw, yt: yaw + d };
  };

  const keys = new Set<string>();
  const kd = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; keys.add(e.key.toLowerCase()); };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);

  /* ---- inspect mode: the product floats in front of the camera, drag to turn it through 360° */
  let insp: { rec: Rec; group: THREE.Group; holder: THREE.Group; ry: number; rx: number; scale: number; auto: boolean; tryRy: number | null; tryRx: number | null; frames?: THREE.Texture[]; frameMesh?: THREE.Mesh; frameIndex?: number } | null = null;
  const dim = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  dim.position.z = -1.0; dim.renderOrder = 900; dim.visible = false; camera.add(dim);
  const inspectOffset = () => (container.clientWidth > 900 ? new THREE.Vector3(-0.32, -0.02, -1.35) : new THREE.Vector3(0, 0.16, -1.45));

  async function inspect(id: number, glbUrl?: string | null, spinFrameUrls: string[] = []) {
    closeInspect();
    const rec = byId.get(id); if (!rec) return;
    const holder = new THREE.Group(); holder.position.copy(inspectOffset()); camera.add(holder);
    const turn = new THREE.Group(); holder.add(turn);
    insp = { rec, group: turn, holder, ry: 0.5, rx: 0, scale: 1, auto: true, tryRy: null, tryRx: null };
    dim.visible = true;
    const mine = insp;
    try {
      if (glbUrl) {
        try {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          // GLB is not an image: use the dedicated model proxy, not the image-only texture proxy.
          const gltf = await new GLTFLoader().loadAsync(proxiedAsset(glbUrl));
          if (insp !== mine) return;
          const obj = gltf.scene;
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const largest = Math.max(size.x, size.y, size.z) || 1;
          obj.position.sub(center);
          const scale = 0.95 / largest;
          obj.scale.setScalar(scale);
          obj.position.multiplyScalar(scale);
          obj.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.material = Array.isArray(mesh.material)
                ? mesh.material.map((material) => material.clone())
                : mesh.material.clone();
            }
          });
          turn.add(new THREE.AmbientLight(0xffffff, 1.8));
          const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
          keyLight.position.set(1, 2, 2);
          turn.add(keyLight, obj);
          return;
        } catch {
          // Fall through to turntable frames or the photo-based inspection fallback.
        }
      }
      if (spinFrameUrls.length > 1) {
        const frames = await Promise.all(spinFrameUrls.map(async (url) => cutout(await loadImage(url))));
        if (insp !== mine) { frames.forEach((frame) => frame.tex.dispose()); return; }
        const first = frames[0];
        const material = new THREE.MeshBasicMaterial({
          map: first.tex, transparent: true, alphaTest: 0.04,
          side: THREE.DoubleSide, toneMapped: false
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95 * first.aspect, 0.95), material);
        turn.add(mesh);
        mine.frames = frames.map((frame) => frame.tex);
        mine.frameMesh = mesh;
        mine.frameIndex = 0;
        return;
      }
      const tx = await ensureTextures(rec);
      if (insp !== mine) return;
      const { group } = buildSlab(tx.front, tx.back, tx.aspect, 0.95, true);
      group.position.y = 0; turn.add(group);
      // make the slab visibly thicker while inspecting so side views read as an object
      group.scale.z = 3.2;
    } catch { /* leave the grey placeholder */ }
  }
  function closeInspect() {
    if (!insp) return;
    camera.remove(insp.holder);
    insp.holder.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && !(m.geometry as THREE.BufferGeometry & { shared?: boolean }).shared) m.geometry.dispose(); });
    insp.frames?.forEach((frame) => frame.dispose());
    insp = null; dim.visible = false; (dim.material as THREE.MeshBasicMaterial).opacity = 0;
  }
  const VIEWS: Record<InspectView, [number, number]> = { front: [0, 0], right: [Math.PI / 2, 0], back: [Math.PI, 0], left: [-Math.PI / 2, 0], top: [0, Math.PI / 2 - 0.05] };
  function setInspectView(v: InspectView) { if (!insp) return; insp.auto = false; const [ry, rx] = VIEWS[v]; const k = Math.round((insp.ry - ry) / (Math.PI * 2)); insp.tryRy = ry + k * Math.PI * 2; insp.tryRx = rx; }
  function zoomInspect(d: number) { if (insp) insp.scale = Math.min(2.4, Math.max(0.5, insp.scale + d)); }

  /* ---- pointer */
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const setNdc = (e: PointerEvent) => { const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const pickables = () => [...recs.map((r) => r.pick), ...hotspots];
  let down: { x: number; y: number; moved: boolean } | null = null;
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, moved: false }; dom.setPointerCapture(e.pointerId); if (!insp) tween = null; else insp.auto = false; };
  const onMove = (e: PointerEvent) => {
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) down.moved = true;
      if (insp) { insp.ry += dx * 0.011; insp.rx = Math.max(-1.45, Math.min(1.45, insp.rx + dy * 0.008)); insp.tryRy = insp.tryRx = null; }
      else { yaw += dx * 0.0042; pitch = Math.max(-0.9, Math.min(0.9, pitch + dy * 0.0036)); }
      down.x = e.clientX; down.y = e.clientY; cb.onHover(null, 0, 0);
    } else if (!insp) {
      setNdc(e); const hit = ray.intersectObjects(pickables(), false)[0];
      dom.style.cursor = hit ? "pointer" : "grab";
      const id = hit && hit.object.userData.item != null ? (hit.object.userData.item as number) : null;
      cb.onHover(id, e.clientX, e.clientY);
    }
  };
  const onUp = (e: PointerEvent) => {
    const tap = down && !down.moved; down = null; if (!tap || insp) return;
    setNdc(e); const hit = ray.intersectObjects(pickables(), false)[0]; if (!hit) return;
    const d = hit.object.userData;
    if (d.item != null) cb.onSelect(d.item as number);
    else if (d.wing != null) { const w = wingInfo[d.wing as number]; const b = w.bays[d.bay as number]; goTo(0, b ? b.z : w.z0 - 3.5, 0); }
  };
  dom.addEventListener("pointerdown", onDown); dom.addEventListener("pointermove", onMove); dom.addEventListener("pointerup", onUp);
  dom.addEventListener("pointerleave", () => cb.onHover(null, 0, 0));
  const onWheel = (e: WheelEvent) => { e.preventDefault(); if (insp) { zoomInspect(-e.deltaY * 0.0012); return; } tween = null; const f = -e.deltaY * 0.004; camera.position.x += -Math.sin(yaw) * f; camera.position.z += -Math.cos(yaw) * f; clampPos(); };
  dom.addEventListener("wheel", onWheel, { passive: false });

  const resize = () => { const w = container.clientWidth || 1, h = container.clientHeight || 1; renderer.setSize(w, h, false); dom.style.width = "100%"; dom.style.height = "100%"; camera.aspect = w / h; camera.fov = w / h < 0.8 ? 82 : 68; camera.updateProjectionMatrix(); if (insp) insp.holder.position.copy(inspectOffset()); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  /* ---- loop */
  let last = performance.now(), elapsed = 0, raf = 0, lw_ = -1, lb_ = -1;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const t = performance.now(), dt = Math.min((t - last) / 1000, 0.05); last = t; elapsed += dt;
    if (tween) {
      tween.t += dt * 1000; const k = Math.min(1, tween.t / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.from, tween.to, e); yaw = tween.yf + (tween.yt - tween.yf) * e; pitch *= 0.94; if (k >= 1) tween = null;
    }
    if (!insp) {
      const fwd = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
      const str = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const turn = (keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0);
      if (fwd || str || turn) { tween = null; yaw += turn * dt * 1.6; const sp = 3.4 * dt; camera.position.x += (-Math.sin(yaw) * fwd + Math.cos(yaw) * str) * sp; camera.position.z += (-Math.cos(yaw) * fwd - Math.sin(yaw) * str) * sp; clampPos(); }
    }
    camera.rotation.set(pitch, yaw, 0);
    hotspots.forEach((h, i) => { const s = 1 + Math.sin(elapsed * 2.2 + i) * 0.08; h.scale.set(s, s, s); });
    recs.forEach((r) => { r.holder.scale.set(1, 1, 1); });
    if (insp) {
      const mat = dim.material as THREE.MeshBasicMaterial; mat.opacity += (0.5 - mat.opacity) * 0.15;
      if (insp.auto) insp.ry += dt * 0.7;
      if (insp.tryRy != null) { insp.ry += (insp.tryRy - insp.ry) * 0.14; insp.rx += ((insp.tryRx ?? 0) - insp.rx) * 0.14; }
      if (insp.frames?.length && insp.frameMesh) {
        // A real API-supplied 360° turntable set: scrub the ordered frames as the shopper drags.
        const turns = ((insp.ry % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const index = Math.round((turns / (Math.PI * 2)) * insp.frames.length) % insp.frames.length;
        if (index !== insp.frameIndex) {
          const material = insp.frameMesh.material as THREE.MeshBasicMaterial;
          material.map = insp.frames[index];
          material.needsUpdate = true;
          insp.frameIndex = index;
        }
        insp.group.rotation.set(0, 0, 0);
      } else {
        insp.group.rotation.set(insp.rx, insp.ry, 0);
      }
      const s = insp.holder.scale.x + (insp.scale - insp.holder.scale.x) * 0.2; insp.holder.scale.setScalar(s);
    }
    // where am I? (for the department / category chips)
    let w = 0; wingInfo.forEach((wi, i) => { if (camera.position.z <= wi.z0 + 1) w = i; });
    let b = 0, bd = 1e9; wingInfo[w].slots.forEach((s) => { const d = Math.abs(s.z - camera.position.z); if (d < bd) { bd = d; b = s.bs; } });
    if (w !== lw_ || b !== lb_) { lw_ = w; lb_ = b; cb.onLocation(w, b); }
    renderer.render(scene, camera);
  };
  loop();

  return {
    goToWing: (i: number) => { const w = wingInfo[i]; if (w) goTo(0, w.z0 - 3.4, 0); },
    goToBay: (wi: number, bi: number) => { const b = wingInfo[wi]?.bays[bi]; if (b) goTo(0, b.z, 0); },
    move: (direction: "forward" | "back" | "left" | "right") => {
      const step = 2.2;
      let x = camera.position.x, z = camera.position.z;
      if (direction === "forward") { x -= Math.sin(yaw) * step; z -= Math.cos(yaw) * step; }
      if (direction === "back") { x += Math.sin(yaw) * step; z += Math.cos(yaw) * step; }
      if (direction === "left") { x -= Math.cos(yaw) * step; z += Math.sin(yaw) * step; }
      if (direction === "right") { x += Math.cos(yaw) * step; z -= Math.sin(yaw) * step; }
      goTo(Math.min(AISLE_HALF, Math.max(-AISLE_HALF, x)), Math.min(START_Z + 1.6, Math.max(endZ + 1.2, z)), yaw);
    },
    inspect, closeInspect, setInspectView, zoomInspect,
    dispose: () => {
      cancelAnimationFrame(raf); clearInterval(loadTimer); ro.disconnect();
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      closeInspect();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose(); x.dispose(); }); });
      recs.forEach((r) => { r.textures?.front.dispose(); r.textures?.back.dispose(); });
      renderer.dispose(); if (dom.parentNode === container) container.removeChild(dom);
    },
  };
}
