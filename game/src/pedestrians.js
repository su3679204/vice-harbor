// The people of Port Solenne: low-poly citizens who stroll the sidewalks,
// cross at corners, flee from gunfire and reckless driving, and fall when
// hit — which the harbour patrol takes very seriously.
import * as THREE from 'three';
import { PED_COLORS, ROAD } from './config.js';
import { ROAD_LINES, collideCircle } from './world.js';

const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
const legMat = new THREE.MeshLambertMaterial({ color: 0x2f3a4a });

export function makePerson(color) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), new THREE.MeshLambertMaterial({ color }));
  torso.position.y = 1.12; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 7), skinMat);
  head.position.y = 1.78; group.add(head);
  for (const s of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.72, 0.24), legMat);
    leg.position.set(s, 0.38, 0); group.add(leg);
  }
  return group;
}

export function createPedestrians(scene, rng, colliders, count = 26) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const mesh = makePerson(rng.pick(PED_COLORS));
    scene.add(mesh);
    // A sidewalk walker: follows one road line at a pavement offset.
    const horizontal = rng.chance(0.5);
    const line = rng.pick(ROAD_LINES);
    const side = rng.chance(0.5) ? 1 : -1;
    const ped = {
      mesh, horizontal, line, side,
      along: rng.range(-125, 125), dir: rng.chance(0.5) ? 1 : -1,
      speed: rng.range(1.1, 1.9), x: 0, z: 0, health: 100, dead: 0, flee: 0, phase: rng.range(0, 6),
    };
    syncPed(ped); peds.push(ped);
  }

  function syncPed(ped) {
    const off = ped.side * (ROAD / 2 + 1.7);
    if (ped.horizontal) { ped.x = ped.along; ped.z = ped.line + off; }
    else { ped.x = ped.line + off; ped.z = ped.along; }
    ped.mesh.position.set(ped.x, ped.dead > 0 ? 0.25 : 0, ped.z);
    ped.mesh.rotation.y = ped.horizontal ? (ped.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : (ped.dir > 0 ? Math.PI : 0);
    if (ped.dead > 0) ped.mesh.rotation.z = Math.PI / 2;
  }

  function update(dt, threats) {
    for (const ped of peds) {
      if (ped.dead > 0) {
        ped.dead -= dt;
        if (ped.dead <= 0) { // quietly leave and rejoin the city elsewhere
          ped.health = 100; ped.along = rng.range(-125, 125); ped.mesh.rotation.z = 0;
        }
        syncPed(ped); continue;
      }
      let speed = ped.speed;
      for (const t of threats) {
        const d = Math.hypot(ped.x - t.x, ped.z - t.z);
        if (d < 9) ped.flee = Math.max(ped.flee, 1.2);
      }
      if (ped.flee > 0) {
        ped.flee -= dt; speed = 4.6;
        // Run away from the nearest threat, sideways off the road line.
        ped.side = ped.side; // keep pavement side; pace is enough drama
      }
      ped.along += ped.dir * speed * dt;
      if (ped.along > 132) ped.dir = -1;
      if (ped.along < -132) ped.dir = 1;
      // Corners: sometimes swap onto the crossing street.
      const crossLine = ROAD_LINES.reduce((a, b) => Math.abs(b - ped.along) < Math.abs(a - ped.along) ? b : a);
      if (Math.abs(crossLine - ped.along) < 0.4 && rng.chance(0.006)) {
        const off = ped.side * (ROAD / 2 + 1.7);
        const px = ped.horizontal ? ped.along : ped.line + off;
        const pz = ped.horizontal ? ped.line + off : ped.along;
        ped.horizontal = !ped.horizontal;
        ped.line = crossLine; ped.along = ped.horizontal ? pz : px;
      }
      syncPed(ped);
      const [cx, cz] = collideCircle(colliders, ped.x, ped.z, 0.4);
      ped.mesh.position.x = cx; ped.mesh.position.z = cz; ped.x = cx; ped.z = cz;
      ped.phase += dt * speed * 2.4;
      ped.mesh.position.y = Math.abs(Math.sin(ped.phase)) * 0.05;
    }
  }
  return { peds, update };
}

export function hurtPed(ped, amount) {
  ped.health -= amount;
  if (ped.health <= 0 && ped.dead <= 0) { ped.dead = 9; return true; }
  return false;
}
