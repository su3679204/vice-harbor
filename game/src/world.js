// Port Solenne itself: a sun-soaked grid of five by five blocks over the
// harbour — roads, sidewalks, pastel towers with lit windows, palms, lamps,
// the Marigold Diner, a lighthouse point and the marina. Buildings are plain
// boxes with a canvas-painted window texture; every solid exports an AABB
// collider the player, cars and police all respect.
import * as THREE from 'three';
import { BLOCK, BLOCKS, BUILDING_COLORS, PITCH, ROAD } from './config.js';

export const ROAD_LINES = [];
for (let i = 0; i <= BLOCKS; i += 1) ROAD_LINES.push(-127.5 + i * PITCH);
export const BLOCK_CENTERS = [];
for (let i = 0; i < BLOCKS; i += 1) BLOCK_CENTERS.push(-102 + i * PITCH);
export const LANE = 3.3;

function windowTexture(rng, base) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 120; y += 12) {
    for (let x = 6; x < 56; x += 12) {
      const lit = rng.chance(0.42);
      g.fillStyle = lit ? '#ffe9a8' : 'rgba(38,52,66,0.85)';
      g.fillRect(x, y, 7, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, rng) {
  const colliders = [];
  const addCollider = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  scene.background = new THREE.Color(0x9fd4e8);
  scene.fog = new THREE.Fog(0xcfe4ea, 190, 460);
  const sun = new THREE.DirectionalLight(0xffe3b3, 2.6);
  sun.position.set(-90, 130, 60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0xe8c9a0, 1.15));

  // Ground, harbour water and beach.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(620, 620), new THREE.MeshLambertMaterial({ color: 0x9db38a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(620, 150), new THREE.MeshLambertMaterial({ color: 0x2e86ab, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.02, 205); scene.add(water);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(620, 26), new THREE.MeshLambertMaterial({ color: 0xf0d9a8 }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.0, 141); scene.add(beach);

  // Roads: dark strips along every grid line, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c4148 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf2e6c9 });
  for (const line of ROAD_LINES) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(286, ROAD), roadMat);
      road.rotation.x = -Math.PI / 2;
      if (!horizontal) road.rotation.z = Math.PI / 2;
      road.position.set(horizontal ? 0 : line, 0.01, horizontal ? line : 0);
      scene.add(road);
      for (let d = -140; d <= 140; d += 14) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.35), lineMat);
        dash.rotation.x = -Math.PI / 2;
        if (!horizontal) dash.rotation.z = Math.PI / 2;
        dash.position.set(horizontal ? d : line, 0.03, horizontal ? line : d);
        scene.add(dash);
      }
    }
  }
  // Sidewalk slabs under each block.
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xd8cfc0 });
  for (const bx of BLOCK_CENTERS) for (const bz of BLOCK_CENTERS) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(BLOCK + 3, 0.24, BLOCK + 3), walkMat);
    slab.position.set(bx, 0.12, bz); scene.add(slab);
  }

  // Buildings: four plots per block, some left as plazas.
  const textures = BUILDING_COLORS.map((c) => windowTexture(rng, '#'.concat(c.toString(16).padStart(6, '0'))));
  const mats = BUILDING_COLORS.map((c, i) => new THREE.MeshLambertMaterial({ map: textures[i], color: 0xffffff }));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x8a6f5c });
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      for (const ox of [-9.5, 9.5]) {
        for (const oz of [-9.5, 9.5]) {
          if (rng.chance(0.16)) continue; // plaza gap
          const w = rng.range(12, 16); const d = rng.range(12, 16);
          const h = rng.range(9, 36) * (Math.abs(bx) + Math.abs(bz) < 60 ? 1.25 : 1);
          const mat = mats[rng.int(0, mats.length - 1)];
          const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mat, mat, roofMat, roofMat, mat, mat]);
          b.position.set(bx + ox, h / 2 + 0.2, bz + oz);
          scene.add(b);
          addCollider(bx + ox, bz + oz, w + 0.4, d + 0.4);
        }
      }
    }
  }

  // The Marigold Diner: a pink landmark at the south-west block, Rosa's place.
  const diner = new THREE.Group();
  const dinerBody = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 12), new THREE.MeshLambertMaterial({ color: 0xf15bb5 }));
  dinerBody.position.y = 3; diner.add(dinerBody);
  const dinerSign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xffe45e }));
  dinerSign.position.set(0, 7.2, 0); diner.add(dinerSign);
  diner.position.set(-102, 0.2, 102); scene.add(diner);
  addCollider(-102, 102, 21, 13);

  // Lighthouse point, north-west rocks.
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.1, 17, 10), new THREE.MeshLambertMaterial({ color: 0xf4f1de }));
  tower.position.set(-146, 8.5, -128); scene.add(tower);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe45e }));
  lamp.position.set(-146, 18, -128); scene.add(lamp);
  addCollider(-146, -128, 6.5, 6.5);

  // Palms and street lamps dress the sidewalks.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6f4d });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  for (let i = 0; i < 64; i += 1) {
    const line = rng.pick(ROAD_LINES); const along = rng.range(-132, 132);
    const side = rng.chance(0.5) ? 1 : -1;
    const x = rng.chance(0.5) ? line + side * (ROAD / 2 + 1.6) : along;
    const z = x === along ? line + side * (ROAD / 2 + 1.6) : along;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 5.6, 6), trunkMat);
    trunk.position.y = 2.8; trunk.rotation.z = rng.range(-0.08, 0.08); palm.add(trunk);
    for (let f = 0; f < 5; f += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.6, 4), frondMat);
      frond.position.y = 5.8; frond.rotation.z = 1.15; frond.rotation.y = (f / 5) * Math.PI * 2;
      frond.translateY(1.2); palm.add(frond);
    }
    palm.position.set(x, 0, z); scene.add(palm);
    addCollider(x, z, 0.8, 0.8);
  }
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x30343f });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const line of ROAD_LINES) {
    for (let d = -128; d <= 128; d += 51) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.4, 5), lampMat);
      pole.position.set(line + ROAD / 2 + 0.7, 2.7, d); scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), bulbMat);
      bulb.position.set(line + ROAD / 2 + 0.7, 5.5, d); scene.add(bulb);
    }
  }

  return { colliders, water };
}

/** Push a circle (x, z, radius) out of every AABB collider; returns corrected [x, z]. */
export function collideCircle(colliders, x, z, radius) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx; const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) { x = c.maxX + radius; continue; }
      const d = Math.sqrt(d2);
      x = nx + (dx / d) * radius; z = nz + (dz / d) * radius;
    }
  }
  return [x, z];
}

export function hitsCollider(colliders, x, z, radius) {
  for (const c of colliders) {
    if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) return true;
  }
  return false;
}
