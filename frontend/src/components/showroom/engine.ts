import * as THREE from "three";

export interface ShowItem {
  id: number;
  name: string;
  priceLabel: string;
  imageUrl: string;
}
export interface ShowZone {
  title: string;
  items: ShowItem[];
}
export interface EngineCallbacks {
  onSelect: (id: number | null) => void;
  onZone: (index: number) => void;
  onProgress: (loaded: number, total: number) => void;
}

const ZONE_LEN = 11;
const HALL_W = 16;
const HALL_H = 5;
const EYE = 1.6;
const ENTRY_Z = 5.5;

const proxied = (url: string) => `/api/showroom-img?u=${encodeURIComponent(url)}`;

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function woodTexture() {
  const t = canvasTex(1024, 1024, (g) => {
    g.fillStyle = "#c9a36d"; g.fillRect(0, 0, 1024, 1024);
    const plankW = 128, plankL = 341;
    for (let i = 0; i < 8; i++) {
      const off = (i % 3) * 110;
      for (let j = -1; j < 4; j++) {
        const base = 150 + Math.random() * 26;
        g.fillStyle = `rgb(${base + 40},${base + 10},${base - 34})`;
        g.fillRect(i * plankW + 1, j * plankL + off + 1, plankW - 2, plankL - 2);
      }
    }
    g.globalAlpha = 0.06;
    for (let k = 0; k < 300; k++) { g.fillStyle = k % 2 ? "#3a2412" : "#ffffff"; g.fillRect(Math.random() * 1024, Math.random() * 1024, 1 + Math.random() * 2, 30 + Math.random() * 140); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function signTexture(text: string, opts: { w?: number; h?: number; size?: number; fg?: string; bg?: string | null; spacing?: number } = {}) {
  const { w = 1024, h = 256, size = 120, fg = "#ffffff", bg = null, spacing = 18 } = opts;
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = fg;
    g.font = `300 ${size}px "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    g.fillText(text, w / 2 + spacing / 2, h / 2);
  });
}

function labelTexture(name: string, price: string) {
  return canvasTex(512, 128, (g) => {
    g.fillStyle = "#fbfaf8"; g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#1b1b1b";
    g.font = "500 30px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const n = name.length > 26 ? name.slice(0, 25) + "…" : name;
    g.fillText(n.toUpperCase(), 256, 44);
    g.font = "400 28px Arial, sans-serif"; g.fillStyle = "#6b6560";
    g.fillText(price, 256, 92);
  });
}

export function createShowroom(container: HTMLElement, zones: ShowZone[], cb: EngineCallbacks) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7dfd3);
  const hallLen = zones.length * ZONE_LEN + 8;
  const endZ = ENTRY_Z + 1.5 - hallLen;
  scene.fog = new THREE.Fog(0xe7dfd3, 18, 62);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 120);
  camera.rotation.order = "YXZ";
  camera.position.set(0, EYE, ENTRY_Z);
  let yaw = 0, pitch = 0;

  // ---- lighting
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x8a7358, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(3, 8, 6);
  scene.add(sun);
  for (let z = ENTRY_Z - 4; z > endZ; z -= 9) {
    const p = new THREE.PointLight(0xfff0dc, 22, 16, 1.6);
    p.position.set(0, HALL_H - 0.6, z);
    scene.add(p);
  }

  // ---- shell
  const floorTex = woodTexture();
  floorTex.repeat.set(HALL_W / 3, hallLen / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, hallLen + 2), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, ENTRY_Z + 1 - hallLen / 2 - 0.5);
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8ccbb, roughness: 0.95 });
  const midZ = (ENTRY_Z + 1.5 + endZ) / 2;
  const wallGeo = new THREE.PlaneGeometry(hallLen + 2, HALL_H);
  const left = new THREE.Mesh(wallGeo, wallMat); left.position.set(-HALL_W / 2, HALL_H / 2, midZ); left.rotation.y = Math.PI / 2; scene.add(left);
  const right = new THREE.Mesh(wallGeo, wallMat); right.position.set(HALL_W / 2, HALL_H / 2, midZ); right.rotation.y = -Math.PI / 2; scene.add(right);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_H), wallMat); back.position.set(0, HALL_H / 2, endZ); scene.add(back);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, HALL_H), wallMat); front.position.set(0, HALL_H / 2, ENTRY_Z + 1.5); front.rotation.y = Math.PI; scene.add(front);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, hallLen + 2), new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, HALL_H, midZ); scene.add(ceil);

  // skirting + recessed light strips (the glowing slots in the Adore reference)
  const strip = new THREE.MeshBasicMaterial({ color: 0xfff6e8 });
  [-3.6, 3.6].forEach((x) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, hallLen), strip);
    s.position.set(x, HALL_H - 0.02, midZ); scene.add(s);
  });
  const skirt = new THREE.MeshStandardMaterial({ color: 0xf2ece3, roughness: 0.8 });
  [-1, 1].forEach((side) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, hallLen + 2), skirt);
    b.position.set(side * (HALL_W / 2 - 0.03), 0.09, midZ); scene.add(b);
  });

  // brand sign on the far wall
  const brand = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), new THREE.MeshBasicMaterial({ map: signTexture("LARKTRIBE", { size: 130, spacing: 26 }), transparent: true }));
  brand.position.set(0, 3.1, endZ + 0.02); scene.add(brand);
  const entrySign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: signTexture("WELCOME", { size: 110, spacing: 22 }), transparent: true }));
  entrySign.position.set(0, 3, ENTRY_Z + 1.47); entrySign.rotation.y = Math.PI; scene.add(entrySign);

  // ---- fixtures + products
  const pickables: THREE.Mesh[] = [];
  const hotspots: THREE.Mesh[] = [];
  const zoneZ: number[] = [];
  const pedMat = new THREE.MeshStandardMaterial({ color: 0xf7f5f1, roughness: 0.7 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.4, metalness: 0.6 });
  const loader = new THREE.TextureLoader();
  let total = 0, done = 0;
  zones.forEach((z) => (total += z.items.length));
  cb.onProgress(0, total);

  const mkHotspot = (x: number, z: number, data: Record<string, unknown>) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.02, z);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.85, depthWrite: false }));
    dot.rotation.x = -Math.PI / 2; dot.position.set(0, 0, 0.001);
    ring.add(dot);
    ring.userData = data;
    scene.add(ring); hotspots.push(ring);
  };

  zones.forEach((zone, zi) => {
    const cz = ENTRY_Z - 7 - zi * ZONE_LEN;
    zoneZ.push(cz);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.1), new THREE.MeshBasicMaterial({ map: signTexture(zone.title.toUpperCase(), { w: 1024, h: 220, size: 96, fg: "#1b1b1b", spacing: 16 }), transparent: true }));
    title.position.set(0, HALL_H - 1.5, cz - 3.4); scene.add(title);
    mkHotspot(0, cz, { zone: zi });

    zone.items.slice(0, 6).forEach((item, i) => {
      const row = i % 2, col = Math.floor(i / 2);
      const x = row === 0 ? -3.3 : 3.3;
      const z = cz + 3.3 - col * 3.3;
      const facing = row === 0 ? Math.PI / 2 - 0.22 : -Math.PI / 2 + 0.22;

      const ped = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.7), pedMat);
      ped.position.set(x, 0.125, z); scene.add(ped);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), poleMat);
      pole.position.set(x, 0.5, z); scene.add(pole);

      const holder = new THREE.Group();
      holder.position.set(x, 1.2, z); holder.rotation.y = facing; scene.add(holder);
      const mat = new THREE.MeshBasicMaterial({ color: 0xeeeae4, side: THREE.DoubleSide, toneMapped: false });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.45), mat);
      card.userData = { item: item.id, holder };
      holder.add(card); pickables.push(card);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.51, 0.03), new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.5 }));
      frame.position.z = -0.025; holder.add(frame);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.275), new THREE.MeshBasicMaterial({ map: labelTexture(item.name, item.priceLabel) }));
      label.position.set(0, -0.98, 0.01); holder.add(label);

      loader.setCrossOrigin("anonymous");
      loader.load(proxied(item.imageUrl), (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const img = tex.image as HTMLImageElement;
        const aspect = img.width / img.height;
        const h = 1.45, w = Math.min(1.5, Math.max(0.8, h * aspect));
        card.geometry.dispose(); card.geometry = new THREE.PlaneGeometry(w, h);
        frame.geometry.dispose(); frame.geometry = new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.03);
        mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
        cb.onProgress(++done, total);
      }, undefined, () => { cb.onProgress(++done, total); });
    });
  });

  // ---- movement
  const maxX = HALL_W / 2 - 0.8;
  const clampPos = () => {
    camera.position.x = Math.min(maxX, Math.max(-maxX, camera.position.x));
    camera.position.z = Math.min(ENTRY_Z + 0.9, Math.max(endZ + 1.2, camera.position.z));
  };
  let tween: { t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; yf: number; yt: number } | null = null;
  const goTo = (x: number, z: number, lookYaw?: number) => {
    const to = new THREE.Vector3(x, EYE, z);
    let yt = lookYaw ?? yaw;
    const d = ((yt - yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; // shortest turn
    yt = yaw + d;
    if (reduced) { camera.position.copy(to); yaw = yt; pitch = 0; return; }
    tween = { t: 0, dur: 1000, from: camera.position.clone(), to, yf: yaw, yt };
  };
  const yawToward = (x: number, z: number) => Math.atan2(-(x - camera.position.x), -(z - camera.position.z));

  const keys = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; keys.add(e.key.toLowerCase()); };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);

  // ---- pointer: drag to look, tap to select/walk
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const setNdc = (e: PointerEvent) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  let down: { x: number; y: number; moved: boolean } | null = null;
  const dom = renderer.domElement;
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, moved: false }; dom.setPointerCapture(e.pointerId); tween = null; };
  const onMove = (e: PointerEvent) => {
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) down.moved = true;
      yaw += dx * 0.0042; pitch = Math.max(-0.9, Math.min(0.9, pitch + dy * 0.0036));
      down.x = e.clientX; down.y = e.clientY;
    } else {
      setNdc(e);
      const hit = ray.intersectObjects([...pickables, ...hotspots], false)[0];
      dom.style.cursor = hit ? "pointer" : "grab";
      hovered = hit?.object ?? null;
    }
  };
  let hovered: THREE.Object3D | null = null;
  const onUp = (e: PointerEvent) => {
    const wasTap = down && !down.moved;
    down = null;
    if (!wasTap) return;
    setNdc(e);
    const hit = ray.intersectObjects([...pickables, ...hotspots], false)[0];
    if (!hit) { cb.onSelect(null); return; }
    const d = hit.object.userData;
    if (d.item != null) {
      const holder = d.holder as THREE.Object3D;
      const p = new THREE.Vector3(); holder.getWorldPosition(p);
      const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), holder.rotation.y);
      const tx = p.x + dir.x * 2.6, tz = p.z + dir.z * 2.6;
      goTo(tx, tz, yawToward(p.x, p.z));
      cb.onSelect(d.item as number);
    } else if (d.zone != null) {
      cb.onSelect(null); cb.onZone(d.zone as number);
      goTo(0, zoneZ[d.zone as number], 0);
    }
  };
  dom.addEventListener("pointerdown", onDown); dom.addEventListener("pointermove", onMove); dom.addEventListener("pointerup", onUp);
  dom.addEventListener("pointercancel", () => { down = null; });
  const onWheel = (e: WheelEvent) => { e.preventDefault(); tween = null; const f = -e.deltaY * 0.004; camera.position.x += -Math.sin(yaw) * f; camera.position.z += -Math.cos(yaw) * f; clampPos(); };
  dom.addEventListener("wheel", onWheel, { passive: false });

  const resize = () => { const w = container.clientWidth || 1, h = container.clientHeight || 1; renderer.setSize(w, h, false); renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%"; camera.aspect = w / h; camera.fov = w / h < 0.8 ? 80 : 68; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  // ---- loop
  let last = performance.now(), elapsed = 0;
  let raf = 0, lastZone = -1;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const t = performance.now(), dt = Math.min((t - last) / 1000, 0.05); last = t; elapsed += dt; const now = elapsed;
    if (tween) {
      tween.t += dt * 1000;
      const k = Math.min(1, tween.t / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.from, tween.to, e); yaw = tween.yf + (tween.yt - tween.yf) * e; pitch *= 0.94;
      if (k >= 1) tween = null;
    }
    const fwd = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const str = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
    const turn = (keys.has("arrowleft") ? 1 : 0) - (keys.has("arrowright") ? 1 : 0);
    if (fwd || str || turn) {
      tween = null; yaw += turn * dt * 1.6;
      const sp = 3.2 * dt;
      camera.position.x += (-Math.sin(yaw) * fwd + Math.cos(yaw) * str) * sp;
      camera.position.z += (-Math.cos(yaw) * fwd - Math.sin(yaw) * str) * sp;
      clampPos();
    }
    camera.rotation.set(pitch, yaw, 0);
    hotspots.forEach((h, i) => { const s = 1 + Math.sin(now * 2.2 + i) * 0.08; h.scale.set(s, s, s); });
    pickables.forEach((m) => { const g = m.userData.holder as THREE.Object3D; const target = hovered === m ? 1.05 : 1; g.scale.x += (target - g.scale.x) * 0.2; g.scale.y = g.scale.x; });
    let zi = 0; zoneZ.forEach((z, i) => { if (camera.position.z < z + ZONE_LEN / 2) zi = i; });
    if (zi !== lastZone) { lastZone = zi; cb.onZone(zi); }
    renderer.render(scene, camera);
  };
  loop();

  return {
    goToZone: (i: number) => { if (zoneZ[i] != null) { cb.onSelect(null); goTo(0, zoneZ[i], 0); } },
    deselect: () => { /* panel closed: nothing to do in 3D */ },
    dispose: () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshBasicMaterial).map?.dispose(); x.dispose(); });
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
  };
}
