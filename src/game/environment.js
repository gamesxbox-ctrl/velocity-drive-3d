import * as THREE from "three";
import { TRACK_WIDTH, ELLIPSE_A, ELLIPSE_B, stripGeometry } from "./track";

const GRASS = 0x6a9a30;
const WATER = 0x1f4d72;

function asphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#7a7c80";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const v = Math.floor(100 + Math.random() * 75);
    ctx.fillStyle = `rgba(${v},${v},${v},0.4)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = "rgba(105,105,105,0.15)";
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let _flagTex = null;
function flagTexture() {
  if (_flagTex) return _flagTex;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#005696";
  ctx.fillRect(0, 0, 128, 80);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(128, 80); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(0, 80); ctx.stroke();
  _flagTex = new THREE.CanvasTexture(canvas);
  _flagTex.colorSpace = THREE.SRGBColorSpace;
  return _flagTex;
}

function addTree(scene, x, z, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.35, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
  );
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  g.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 4.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c7a33 })
  );
  leaves.position.y = 3.4;
  leaves.castShadow = true;
  g.add(leaves);
  g.scale.setScalar(s);
  g.position.set(x, 0, z);
  scene.add(g);
}

function addSheep(scene, x, z, rot) {
  const group = new THREE.Group();
  const wool = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.8, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f0 })
  );
  wool.position.y = 0.9;
  wool.castShadow = true;
  group.add(wool);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.5, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  head.position.set(0, 1.05, -0.95);
  group.add(head);
  [-0.3, 0.3].forEach((lx) =>
    [-0.5, 0.5].forEach((lz) => {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.5, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
      );
      leg.position.set(lx, 0.25, lz);
      group.add(leg);
    })
  );
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  scene.add(group);
}

function addBuilding(scene, x, z, w, d, h) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0xa08b78 })
  );
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.72, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0x6b4a35 })
  );
  roof.position.y = h + 1.5;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);
  const winMat = new THREE.MeshStandardMaterial({ color: 0x9db8c8 });
  const rows = Math.max(1, Math.floor(h / 3.2));
  const cols = Math.max(2, Math.floor(w / 3));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.12), winMat);
      win.position.set(
        -w / 2 + (c + 0.5) * (w / cols),
        1.6 + r * 3.2,
        -d / 2 - 0.05
      );
      group.add(win);
    }
  }
  group.position.set(x, 0, z);
  scene.add(group);
}

function addBoat(scene, x, z, rot) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.9, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a4a2a })
  );
  hull.position.y = 0.45;
  hull.castShadow = true;
  group.add(hull);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.9, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })
  );
  cabin.position.y = 1.3;
  cabin.castShadow = true;
  group.add(cabin);
  group.position.set(x, 0.05, z);
  group.rotation.y = rot;
  scene.add(group);
}

function addFlag(scene, x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 7, 8),
    new THREE.MeshStandardMaterial({ color: 0xf0f0f0 })
  );
  pole.position.y = 3.5;
  pole.castShadow = true;
  group.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide })
  );
  flag.position.set(1.25, 6, 0);
  flag.castShadow = true;
  group.add(flag);
  group.position.set(x, 0, z);
  scene.add(group);
}

function addCastle(scene) {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0xa3a6a1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4d5d75 });
  const keep = new THREE.Mesh(new THREE.BoxGeometry(14, 18, 14), stone);
  keep.position.y = 9;
  keep.castShadow = true;
  group.add(keep);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), roofMat);
  keepRoof.position.y = 20.5;
  keepRoof.rotation.y = Math.PI / 4;
  keepRoof.castShadow = true;
  group.add(keepRoof);
  [
    [-13, -13],
    [13, -13],
    [-13, 13],
    [13, 13],
  ].forEach(([px, pz]) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 16, 10), stone);
    tower.position.set(px, 8, pz);
    tower.castShadow = true;
    group.add(tower);
    const tRoof = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 10), roofMat);
    tRoof.position.set(px, 18.5, pz);
    tRoof.castShadow = true;
    group.add(tRoof);
  });
  scene.add(group);
}

export function buildEnvironment(scene) {
  // Ground (grass)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: GRASS })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Asphalt track
  const road = new THREE.Mesh(
    stripGeometry(-TRACK_WIDTH / 2, TRACK_WIDTH / 2),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(), side: THREE.DoubleSide })
  );
  road.position.y = 0.02;
  road.receiveShadow = true;
  scene.add(road);

  // Dashed white centerline
  const dashGeo = new THREE.PlaneGeometry(0.35, 2.6);
  dashGeo.rotateX(-Math.PI / 2);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const DASHES = 96;
  for (let i = 0; i < DASHES; i++) {
    const t = (i / DASHES) * Math.PI * 2;
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(ELLIPSE_A * Math.cos(t), 0.035, ELLIPSE_B * Math.sin(t));
    dash.rotation.y = Math.atan2(-ELLIPSE_A * Math.sin(t), ELLIPSE_B * Math.cos(t));
    scene.add(dash);
  }

  // River along the outside of the start straight
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 44),
    new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.25, metalness: 0.1 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.01, 112);
  scene.add(water);

  // Dock posts along the near bank
  const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 6);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a });
  for (let x = -160; x <= 160; x += 40) {
    [90, 93].forEach((pz) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, 0.6, pz);
      post.castShadow = true;
      scene.add(post);
    });
  }

  // Boats on the river
  [
    [-120, 104, 0.2],
    [-30, 110, -0.35],
    [60, 102, 0.15],
    [140, 108, -0.1],
  ].forEach(([bx, bz, br]) => addBoat(scene, bx, bz, br));

  // Stone buildings between the track and the river
  [
    [-95, 12, 8, 9],
    [-45, 14, 8, 11],
    [5, 13, 8, 7],
    [55, 12, 8, 10],
    [105, 14, 8, 8],
  ].forEach(([bx, bw, bd, bh]) => addBuilding(scene, bx, 80, bw, bd, bh));

  // Castle in the infield
  addCastle(scene);

  // Flags near the start straight
  addFlag(scene, 14, 72);
  addFlag(scene, -14, 72);

  // Trees — infield and far riverbank
  let placed = 0;
  let guard = 0;
  while (placed < 18 && guard < 200) {
    guard++;
    const t = Math.random() * Math.PI * 2;
    const r = 0.2 + Math.random() * 0.65;
    const x = (ELLIPSE_A - 24) * r * Math.cos(t);
    const z = (ELLIPSE_B - 24) * r * Math.sin(t);
    if (Math.abs(x) < 24 && Math.abs(z) < 24) continue; // keep the castle clear
    addTree(scene, x, z, 0.8 + Math.random() * 0.7);
    placed++;
  }
  for (let i = 0; i < 14; i++) {
    addTree(scene, -280 + Math.random() * 560, 138 + Math.random() * 22, 0.8 + Math.random() * 0.7);
  }

  // Sheep on the infield
  [
    [42, 26, 2.2],
    [58, 12, 0.6],
    [-48, -18, 1.4],
    [-62, 14, 4.2],
    [28, -38, 3.1],
  ].forEach(([sx, sz, sr]) => addSheep(scene, sx, sz, sr));
}