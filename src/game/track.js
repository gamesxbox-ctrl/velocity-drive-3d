import * as THREE from "three";

export const TRACK_WIDTH = 18;
export const ELLIPSE_A = 90; // x semi-axis of track centerline
export const ELLIPSE_B = 60; // z semi-axis

// Flat ring strip around the elliptical centerline, from normal-offset off1 to off2
export function stripGeometry(off1, off2) {
  const SEG = 128;
  const verts = [];
  const uvs = [];
  for (let i = 0; i < SEG; i++) {
    const t1 = (i / SEG) * Math.PI * 2;
    const t2 = ((i + 1) / SEG) * Math.PI * 2;
    const pts = [t1, t2].map((t) => {
      const cx = ELLIPSE_A * Math.cos(t);
      const cz = ELLIPSE_B * Math.sin(t);
      const nx = ELLIPSE_B * Math.cos(t);
      const nz = ELLIPSE_A * Math.sin(t);
      const nl = Math.hypot(nx, nz);
      return { cx, cz, ux: nx / nl, uz: nz / nl };
    });
    const [p1, p2] = pts;
    const in1 = [p1.cx + p1.ux * off1, p1.cz + p1.uz * off1];
    const in2 = [p2.cx + p2.ux * off1, p2.cz + p2.uz * off1];
    const out1 = [p1.cx + p1.ux * off2, p1.cz + p1.uz * off2];
    const out2 = [p2.cx + p2.ux * off2, p2.cz + p2.uz * off2];
    const u1 = (i / SEG) * 150; // texture tiles along the track
    const u2 = ((i + 1) / SEG) * 150;
    verts.push(
      in1[0], 0, in1[1],
      in2[0], 0, in2[1],
      out1[0], 0, out1[1],
      out1[0], 0, out1[1],
      in2[0], 0, in2[1],
      out2[0], 0, out2[1]
    );
    uvs.push(u1, 0, u2, 0, u1, 1, u1, 1, u2, 0, u2, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

// Precomputed centerline points for on-track checks and lap progress
export const CENTERLINE = [];
for (let i = 0; i < 256; i++) {
  const t = (i / 256) * Math.PI * 2;
  CENTERLINE.push([ELLIPSE_A * Math.cos(t), ELLIPSE_B * Math.sin(t)]);
}

export function nearestCenterlineIndex(x, z) {
  let min = Infinity;
  let best = 0;
  for (let i = 0; i < CENTERLINE.length; i++) {
    const [cx, cz] = CENTERLINE[i];
    const d = (x - cx) * (x - cx) + (z - cz) * (z - cz);
    if (d < min) {
      min = d;
      best = i;
    }
  }
  return best;
}

export function centerDistance(x, z) {
  const i = nearestCenterlineIndex(x, z);
  const [cx, cz] = CENTERLINE[i];
  return Math.hypot(x - cx, z - cz);
}