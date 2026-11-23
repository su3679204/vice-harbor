// The story engine: Rosa Venn's six jobs for Jules Marlowe, run as legs —
// reach a marker, fetch crates, shake the patrol, beat a ferry timer, run a
// checkpoint race. A glowing pillar marks the way; the HUD and minimap read
// the same target. Finishing a mission pays cash and saves the game.
import * as THREE from 'three';
import { MISSIONS, SHELL_COUNT } from './config.js';

const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.5, depthWrite: false });
const markerRingMat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.85, depthWrite: false });
const crateMat = new THREE.MeshLambertMaterial({ color: 0xb5651d });
const shellMat = new THREE.MeshBasicMaterial({ color: 0x7bf1d3 });

function makeMarker() {
  const group = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 26, 14, 1, true), markerMat);
  pillar.position.y = 13; group.add(pillar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.16, 8, 28), markerRingMat);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.35; group.add(ring);
  group.visible = false;
  return group;
}

export function createMissions(scene, callbacks) {
  const marker = makeMarker(); scene.add(marker);
  const altMarker = makeMarker(); scene.add(altMarker);
  const crates = [];
  for (let i = 0; i < 3; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), crateMat);
    crate.visible = false; scene.add(crate); crates.push(crate);
  }

  const state = {
    missionIndex: 0, legIndex: 0, active: false, done: false,
    collected: 0, raceIndex: 0, timer: -1, raisedHeat: false, crimeDone: false,
  };

  const mission = () => MISSIONS[Math.min(state.missionIndex, MISSIONS.length - 1)];
  const leg = () => mission().legs[state.legIndex];

  function showMarkerAt(x, z, m = marker) { m.position.set(x, 0, z); m.visible = true; }

  function startMission(index) {
    state.missionIndex = index; state.legIndex = 0; state.done = index >= MISSIONS.length;
    state.active = !state.done;
    beginLeg();
    if (state.active) callbacks.onMissionStart(mission());
  }

  function beginLeg() {
    for (const c of crates) c.visible = false;
    marker.visible = false; altMarker.visible = false;
    state.collected = 0; state.raceIndex = 0; state.raisedHeat = false; state.crimeDone = false;
    if (!state.active) return;
    const L = leg();
    state.timer = typeof L.timer === 'number' ? L.timer : -1;
    if (L.kind === 'collect') {
      L.points.forEach(([x, z], i) => { crates[i].position.set(x, 0.9, z); crates[i].visible = true; });
    } else if (L.kind === 'race') {
      const [x, z] = L.points[0]; showMarkerAt(x, z);
    } else {
      showMarkerAt(L.x, L.z);
    }
    callbacks.onLeg(mission(), L, state);
  }

  function failMission(reason) {
    callbacks.onMissionFail(mission(), reason);
    state.legIndex = 0; beginLeg();
  }

  function completeLeg(ctx) {
    const m = mission();
    state.legIndex += 1;
    if (state.legIndex >= m.legs.length) {
      state.active = state.missionIndex + 1 < MISSIONS.length;
      const next = state.missionIndex + 1;
      callbacks.onMissionDone(m);
      state.missionIndex = next; state.legIndex = 0;
      state.done = next >= MISSIONS.length;
      state.active = !state.done;
      if (state.active) { callbacks.onMissionStart(mission()); beginLeg(); }
      else { marker.visible = false; callbacks.onStoryDone(); }
    } else {
      callbacks.onLegDone(m, leg());
      beginLeg();
    }
    void ctx;
  }

  function target() {
    if (!state.active) return null;
    const L = leg();
    if (L.kind === 'collect') {
      for (let i = 0; i < L.points.length; i += 1) if (crates[i].visible) return { x: L.points[i][0], z: L.points[i][1] };
      return null;
    }
    if (L.kind === 'race') {
      if (state.raceIndex < L.points.length) { const [x, z] = L.points[state.raceIndex]; return { x, z }; }
      return { x: L.finish[0], z: L.finish[1] };
    }
    return { x: L.x, z: L.z };
  }

  function objectiveText() {
    if (state.done) return 'Story complete — free roam Port Solenne. Find neon shells for cash.';
    if (!state.active) return '';
    const L = leg();
    if (L.kind === 'collect') return `${L.label} (${state.collected}/${L.count})`;
    if (L.kind === 'race') return `${L.label} — checkpoint ${Math.min(state.raceIndex + 1, L.points.length)}/${L.points.length}`;
    if (L.kind === 'escape' && !state.raisedHeat) return 'Cause enough trouble to draw the patrol (2 stars), then lose them';
    return L.label;
  }

  function update(dt, ctx) {
    marker.rotation.y += dt * 0.8; altMarker.rotation.y -= dt * 0.8;
    for (const c of crates) if (c.visible) c.rotation.y += dt * 1.4;
    if (!state.active) return;
    const L = leg();
    if (L.crime && !state.crimeDone && ctx.near(L.x, L.z, 9)) { state.crimeDone = true; ctx.addWanted(L.crime); }
    if (state.timer > 0) {
      state.timer -= dt;
      if (state.timer <= 0) { failMission('Out of time'); return; }
    }
    const p = ctx.player;
    if (L.kind === 'reach') {
      if (ctx.distTo(L.x, L.z) < L.r && (!L.needCar || ctx.inCar)) completeLeg(ctx);
    } else if (L.kind === 'collect') {
      L.points.forEach(([x, z], i) => {
        if (crates[i].visible && Math.hypot(p.x - x, p.z - z) < 3.2) {
          crates[i].visible = false; state.collected += 1; callbacks.onPickup('crate');
          if (state.collected >= L.count) completeLeg(ctx);
        }
      });
    } else if (L.kind === 'escape') {
      if (ctx.wanted >= 2) state.raisedHeat = true;
      if (state.raisedHeat && ctx.wanted <= 0 && ctx.distTo(L.x, L.z) < L.r) completeLeg(ctx);
      else if (state.raisedHeat && ctx.wanted <= 0) showMarkerAt(L.x, L.z);
    } else if (L.kind === 'race') {
      if (state.raceIndex < L.points.length) {
        const [x, z] = L.points[state.raceIndex];
        showMarkerAt(x, z);
        if (Math.hypot(p.x - x, p.z - z) < 10) { state.raceIndex += 1; callbacks.onPickup('checkpoint'); }
      } else {
        showMarkerAt(L.finish[0], L.finish[1]);
        if (Math.hypot(p.x - L.finish[0], p.z - L.finish[1]) < 9) completeLeg(ctx);
      }
    }
  }

  return { state, startMission, update, target, objectiveText, mission };
}

/** Neon shells: twenty glowing collectibles on the pavements, $50 each. */
export function createShells(scene, rng) {
  const shells = [];
  const geo = new THREE.SphereGeometry(0.55, 10, 8);
  for (let i = 0; i < SHELL_COUNT; i += 1) {
    const mesh = new THREE.Mesh(geo, shellMat);
    const x = rng.range(-128, 128); const z = rng.range(-128, 128);
    mesh.position.set(x, 1.1, z); scene.add(mesh);
    shells.push({ mesh, x, z, taken: false });
  }
  return {
    shells,
    update(dt, player, onTake) {
      for (const s of shells) {
        if (s.taken) continue;
        s.mesh.rotation.y += dt * 2;
        s.mesh.position.y = 1.1 + Math.sin(performance.now() / 400 + s.x) * 0.18;
        if (Math.hypot(player.x - s.x, player.z - s.z) < 2.4) { s.taken = true; s.mesh.visible = false; onTake(s); }
      }
    },
  };
}
