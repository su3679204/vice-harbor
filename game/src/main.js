// VICE HARBOR — boot and the one loop. Wires the city, traffic, pedestrians,
// police, missions and HUD together: on foot or in a stolen car, committing
// crimes raises the wanted stars, the harbour patrol answers, and Rosa
// Venn's six jobs carry Jules Marlowe from broke courier to Harbour King.
//
// ?seed=N fixes the city. ?shot=start|play|chase|end (with &seed=N) stages
// a deterministic scene instead of running the loop and sets
// window.__shotReady once it is painted.
import * as THREE from 'three';
import { CRIMES, MISSIONS, STEP, WANTED } from './config.js';
import { createRandom } from './random.js';
import { ACTION_CONFIRM, ACTION_INTERACT, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { buildWorld, collideCircle } from './world.js';
import { createPolice, createTraffic, driveCar, syncCar } from './vehicles.js';
import { createPedestrians, hurtPed } from './pedestrians.js';
import { createPlayer } from './player.js';
import { createMissions, createShells } from './missions.js';
import { createHud, zoneName } from './hud.js';
import { clearSave, loadSave, readBest, storeSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 11;

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 900);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const rng = createRandom(seed);
const world = buildWorld(scene, rng);
const traffic = createTraffic(scene, rng);
const police = createPolice(scene);
const peds = createPedestrians(scene, rng, world.colliders);
const { player, update: updatePlayer } = createPlayer(scene, world.colliders);
const audio = createAudio();
const hud = createHud();
const realInput = createInput(renderer.domElement);
let fakeInput = null;
const input = () => fakeInput ?? realInput;

const state = {
  screen: 'title', cash: 60, wanted: 0, bust: 0, shellsFound: 0,
  storyDone: false, unseenTime: 0, crimeCooldown: 0, shotFlash: 0, muted: false,
};

const missions = createMissions(scene, {
  onMissionStart(m) { hud.showBanner(m.title, m.intro, 5.5); },
  onMissionDone(m) {
    state.cash += m.reward;
    hud.showBanner('Mission complete', `${m.title} — $${m.reward} paid. ${state.storyDone ? '' : 'Next job is on the map.'}`, 4.5);
    audio.missionDone(); persist();
  },
  onLegDone() { audio.pickup(); },
  onLeg(m) { void m; },
  onPickup(kind) {
    audio.pickup();
    hud.showToast(kind === 'crate' ? 'Crate recovered' : 'Checkpoint!', 1.6);
  },
  onMissionFail(m, reason) {
    hud.showBanner('Mission failed', `${m.title}: ${reason}. The job restarts — follow the gold pillar.`, 4);
    audio.missionFail();
  },
  onStoryDone() {
    state.storyDone = true;
    hud.showBanner('HARBOUR KING', 'The debt is dead. Port Solenne is yours, Jules — free roam, find the neon shells.', 7);
    persist();
  },
});
const shells = createShells(scene, rng);

function persist() {
  storeSave({ cash: state.cash, missionIndex: missions.state.missionIndex, shellsFound: state.shellsFound, storyDone: state.storyDone });
}

function focus() {
  return player.inCar ? { x: player.inCar.x, z: player.inCar.z } : { x: player.x, z: player.z };
}

function addWanted(n) {
  if (n <= 0) return;
  state.wanted = Math.min(5, state.wanted + n);
  state.unseenTime = 0;
}

function commitCrime(kind) {
  if (state.crimeCooldown > 0) return;
  state.crimeCooldown = 3.5;
  addWanted(CRIMES[kind] ?? 1);
}

// --- entering and leaving cars -------------------------------------------
function tryInteract() {
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.x = car.x + Math.cos(car.heading) * 2.4;
    player.z = car.z - Math.sin(car.heading) * 2.4;
    const [cx, cz] = collideCircle(world.colliders, player.x, player.z, 0.55);
    player.x = cx; player.z = cz;
    audio.click();
    return;
  }
  let best = null; let bestD = 3.6;
  for (const car of [...traffic.cars, ...police.units]) {
    const d = Math.hypot(car.x - player.x, car.z - player.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best) return;
  if (best.kind === 'police') { hud.showToast('Locked. The patrol keeps its keys.', 2); return; }
  player.inCar = best;
  if (!best.stolen) {
    best.stolen = true;
    if (best.kind === 'traffic') { best.driverless = true; commitCrime('steal'); hud.showToast('Borrowed. The owner disagrees.', 2); }
  }
  audio.click();
}

// --- combat ----------------------------------------------------------------
function shoot() {
  if (player.shotCooldown > 0 || player.inCar) return;
  player.shotCooldown = 0.27;
  state.shotFlash = 1;
  audio.shot();
  commitCrime('shoot');
  const fx = -Math.sin(camYaw); const fz = -Math.cos(camYaw);
  let bestPed = null; let bestScore = 0.965;
  for (const ped of peds.peds) {
    if (ped.dead > 0) continue;
    const dx = ped.x - player.x; const dz = ped.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 30 || dist < 0.5) continue;
    const dot = (dx * fx + dz * fz) / dist;
    if (dot > bestScore) { bestScore = dot; bestPed = ped; }
  }
  if (bestPed) {
    audio.hit();
    if (hurtPed(bestPed, 70)) addWanted(CRIMES.hitPed);
    return;
  }
  for (const unit of police.units) {
    const dx = unit.x - player.x; const dz = unit.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 30 && (dx * fx + dz * fz) / Math.max(dist, 0.001) > 0.94) {
      unit.health -= 34; audio.hit(); addWanted(CRIMES.hitCop);
      if (unit.health <= 0) { unit.speed = 0; unit.health = 40; }
      return;
    }
  }
}

// --- fate --------------------------------------------------------------------
function fate(kind) {
  state.screen = 'fate';
  document.getElementById('fate-screen').hidden = false;
  const title = document.getElementById('fate-title');
  const copy = document.getElementById('fate-copy');
  if (kind === 'busted') {
    const fine = Math.floor(state.cash * 0.15);
    state.cash -= fine;
    title.textContent = 'BUSTED';
    copy.textContent = `The harbour patrol held you at the Old Town lockup. Fine: $${fine}. Rosa heard everything.`;
    audio.busted();
    player.x = 20; player.z = 20;
  } else {
    const bill = Math.min(100, state.cash);
    state.cash -= bill;
    title.textContent = 'WASTED';
    copy.textContent = `You wake up outside Solenne General. Hospital bill: $${bill}. The city kept spinning without you.`;
    player.x = -52; player.z = -20;
  }
  if (player.inCar) { player.inCar.speed = 0; player.inCar = null; }
  player.health = 100; state.wanted = 0; state.bust = 0;
  persist();
}

// --- the fixed-step simulation ------------------------------------------------
let camYaw = 0.7; let camPitch = 0.34; let camVista = null;
const policeEvents = { ram: false };

function step(dt) {
  const inp = input();
  state.crimeCooldown = Math.max(0, state.crimeCooldown - dt);
  state.shotFlash = Math.max(0, state.shotFlash - dt * 5);

  if (state.screen === 'play') {
    const actions = inp.takeActions();
    if (actions & ACTION_PAUSE) { pauseGame(); return; }
    if (actions & ACTION_INTERACT) tryInteract();
    const mouse = inp.takeMouse();
    if (inp.isLocked?.()) { camYaw -= mouse.x * 0.0026; camPitch = Math.max(0.06, Math.min(1.1, camPitch + mouse.y * 0.0022)); }
    if (inp.firing()) shoot();
  }

  // Player and car.
  let carSpeed = 0;
  if (player.inCar) {
    const car = player.inCar;
    carSpeed = state.screen === 'play' ? driveCar(car, inp, dt) : car.speed;
    const before = Math.abs(carSpeed);
    const [cx, cz] = collideCircle(world.colliders, car.x, car.z, 1.7);
    if (Math.abs(cx - car.x) > 0.01 || Math.abs(cz - car.z) > 0.01) {
      car.x = cx; car.z = cz;
      if (before > 9) { audio.crash(Math.min(1, before / 26)); player.health -= before * 0.22; car.health -= before * 0.8; }
      car.speed *= -0.22; syncCar(car);
    }
    car.x = Math.max(-158, Math.min(158, car.x)); car.z = Math.max(-158, Math.min(158, car.z));
    player.x = car.x; player.z = car.z;
    if (car.health <= 0 && Math.abs(car.speed) < 0.5) { hud.showToast('This car is wrecked. Find another.', 2.5); }
    if (car.health <= 0) car.speed = 0;
  } else {
    updatePlayer(dt, state.screen === 'play' ? inp : idleInput, camYaw);
  }

  // Traffic versus the player's car: bumps, and running people over.
  const f = focus();
  const obstacles = [{ x: f.x, z: f.z }];
  for (const u of police.units) obstacles.push({ x: u.x, z: u.z });
  for (const c of traffic.cars) if (c !== player.inCar) obstacles.push({ x: c.x, z: c.z });
  traffic.update(dt, obstacles);
  if (player.inCar && Math.abs(player.inCar.speed) > 2) {
    for (const c of traffic.cars) {
      if (c === player.inCar) continue;
      const d = Math.hypot(c.x - player.inCar.x, c.z - player.inCar.z);
      if (d < 3.1) {
        audio.crash(0.7); commitCrime('hitCar');
        c.speed = 0; player.inCar.speed *= 0.45; player.inCar.health -= 4;
        const push = 3.1 - d + 0.1;
        c.x += (c.x - player.inCar.x) / (d || 1) * push; c.z += (c.z - player.inCar.z) / (d || 1) * push;
        syncCar(c);
      }
    }
    for (const ped of peds.peds) {
      if (ped.dead > 0) continue;
      if (Math.hypot(ped.x - player.inCar.x, ped.z - player.inCar.z) < 1.9) {
        if (hurtPed(ped, 100)) { addWanted(CRIMES.hitPed); audio.crash(0.5); }
      }
    }
  }

  // Pedestrians flee gunfire and fast cars.
  const threats = [];
  if (state.shotFlash > 0.4) threats.push({ x: player.x, z: player.z });
  if (player.inCar && Math.abs(player.inCar.speed) > 9) threats.push({ x: player.inCar.x, z: player.inCar.z });
  peds.update(dt, threats);

  // The law.
  policeEvents.ram = false;
  const target = { x: f.x, z: f.z, inCar: !!player.inCar, speed: player.inCar ? player.inCar.speed : player.speedNow };
  const law = police.update(dt, target, state.wanted, rng, policeEvents);
  if (state.wanted > 0) {
    if (law.sees) state.unseenTime = 0; else state.unseenTime += dt;
    if (state.unseenTime > WANTED.coolPerStar) { state.wanted -= 1; state.unseenTime = 0; if (state.wanted === 0) hud.showToast('You lost the patrol.', 2.2); }
    // Bust pressure: a close unit and a slow target.
    if (!player.inCar && law.nearest < WANTED.bustRange && Math.abs(target.speed) < 2.2) state.bust += dt / WANTED.bustFillSeconds;
    else if (player.inCar && law.nearest < 4.2 && Math.abs(target.speed) < 1.5) state.bust += dt / (WANTED.bustFillSeconds * 1.6);
    else state.bust = Math.max(0, state.bust - dt * 0.7);
    // Patrol gunfire at high heat.
    if (state.wanted >= 3 && law.sees && law.nearest < 20 && !player.inCar) player.health -= dt * (state.wanted - 1) * 1.5;
    if (policeEvents.ram && player.inCar) { player.health -= 1.6; player.inCar.health -= 3; }
    if (state.bust >= 1 && state.screen === 'play') fate('busted');
  } else state.bust = 0;
  audio.setSiren(state.wanted > 0 && law.count > 0 && !state.muted, dt);
  audio.setEngine(player.inCar ? Math.abs(player.inCar.speed) / 34 : 0, !!player.inCar && !state.muted);

  // Health regen in calm moments, death, missions, shells.
  if (state.wanted === 0 && player.health > 0) player.health = Math.min(100, player.health + dt * 1.6);
  if (player.health <= 0 && state.screen === 'play') { fate('wasted'); return; }
  missions.update(dt, {
    player: f, inCar: !!player.inCar, wanted: state.wanted,
    near: (x, z, r) => Math.hypot(f.x - x, f.z - z) < r,
    distTo: (x, z) => Math.hypot(f.x - x, f.z - z),
    addWanted,
  });
  shells.update(dt, f, () => {
    state.cash += 50; state.shellsFound += 1; audio.cash();
    hud.showToast(`Neon shell ${state.shellsFound}/20 — +$50`, 1.8); persist();
  });

  // Camera: follow behind the focus unless a vista override is staged.
  if (!camVista) {
    if (!inp.isLocked?.()) {
      const heading = player.inCar ? player.inCar.heading : player.heading;
      let diff = heading - camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (state.screen === 'play') camYaw += diff * Math.min(1, dt * 2.6);
    }
    const dist = player.inCar ? 13 : 8.6;
    const height = (player.inCar ? 4.4 : 3.4) + camPitch * 5;
    const tx = f.x + Math.sin(camYaw) * dist;
    const tz = f.z + Math.cos(camYaw) * dist;
    camera.position.set(tx, height, tz);
    camera.lookAt(f.x, 1.5, f.z);
  } else {
    camera.position.set(camVista.x, camVista.y, camVista.z);
    camera.lookAt(camVista.tx, camVista.ty, camVista.tz);
  }
  if (world.water) world.water.position.y = -0.02 + Math.sin(performance.now() / 900) * 0.03;
}

const idleInput = {
  axis: () => ({ x: 0, z: 0 }), run: () => false, brake: () => false,
  firing: () => false, takeActions: () => 0, takeMouse: () => ({ x: 0, y: 0 }), isLocked: () => false,
};

// --- screens ------------------------------------------------------------------
const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const fateScreen = document.getElementById('fate-screen');

function beginPlay(continued) {
  titleScreen.hidden = true; fateScreen.hidden = true; pauseScreen.hidden = true;
  state.screen = 'play';
  audio.unlock();
  if (!continued) missions.startMission(missions.state.missionIndex);
  document.getElementById('status').textContent = 'Playing VICE HARBOR.';
}
function pauseGame() {
  if (state.screen !== 'play') return;
  state.screen = 'paused'; pauseScreen.hidden = false;
}
function resumeGame() { pauseScreen.hidden = true; state.screen = 'play'; }

function newGame() {
  clearSave();
  state.cash = 60; state.wanted = 0; state.shellsFound = 0; state.storyDone = false;
  player.health = 100; player.inCar = null; player.x = -96; player.z = 118;
  missions.startMission(0);
  beginPlay(true);
}
function continueGame() {
  const save = loadSave();
  if (save) {
    state.cash = save.cash; state.shellsFound = save.shells ?? 0; state.storyDone = save.done === true;
    shells.shells.forEach((s, i) => { if (i < state.shellsFound) { s.taken = true; s.mesh.visible = false; } });
    missions.startMission(Math.min(save.mission, MISSIONS.length));
    if (state.storyDone) missions.state.done = true;
  } else missions.startMission(0);
  beginPlay(true);
}

document.getElementById('play-new').addEventListener('click', newGame);
document.getElementById('play-continue').addEventListener('click', continueGame);
document.getElementById('resume').addEventListener('click', resumeGame);
document.getElementById('restart').addEventListener('click', () => { pauseScreen.hidden = true; newGame(); });
document.getElementById('fate-ok').addEventListener('click', () => beginPlay(true));
renderer.domElement.addEventListener('click', () => { if (state.screen === 'play') realInput.lock(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') { state.muted = !state.muted; hud.showToast(state.muted ? 'Sound off' : 'Sound on', 1.2); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && state.screen === 'paused') resumeGame();
});

const existingSave = loadSave();
if (existingSave) document.getElementById('play-continue').hidden = false;
const best = readBest();
if (best > 0) document.getElementById('best-line').textContent = `Best cash held: $${best}. Progress saves after every mission.`;

// --- main loop -------------------------------------------------------------------
let accumulator = 0; let last = performance.now();
function refreshHud() {
  hud.update({
    wanted: state.wanted, cash: state.cash, health: player.health,
    objective: state.screen === 'title' ? 'Press New game — Rosa is waiting at the Marigold Diner.' : missions.objectiveText(),
    missionTitle: missions.state.done ? 'VICE HARBOR — STORY COMPLETE' : `MISSION ${Math.min(missions.state.missionIndex + 1, MISSIONS.length)} · ${missions.mission().title.toUpperCase()}`,
    timer: missions.state.timer, inCar: !!player.inCar,
    carSpeed: player.inCar ? player.inCar.speed : 0,
    zone: zoneName(focus().x, focus().z), bust: state.bust,
  }, {
    traffic: traffic.cars, peds: peds.peds, police: police.units,
    target: missions.target(), player: { x: focus().x, z: focus().z, heading: player.inCar ? player.inCar.heading : player.heading },
  });
  document.getElementById('crosshair').style.opacity = player.inCar || state.screen !== 'play' ? '0' : '1';
  document.getElementById('hint').style.opacity = state.screen === 'play' ? '1' : '0';
}
function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, 0.25); last = now;
  if (state.screen !== 'paused') {
    while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
  } else accumulator = 0;
  refreshHud();
  renderer.render(scene, camera);
}

// Debug + screenshot staging surface.
const gameApi = {
  state, player, traffic, police, peds, missions, hud,
  step, focus,
  setFakeInput(spec) {
    if (!spec) { fakeInput = null; return; }
    fakeInput = {
      axis: () => ({ x: spec.x ?? 0, z: spec.z ?? 0 }),
      run: () => !!spec.run, brake: () => !!spec.brake, firing: () => !!spec.firing,
      takeActions: () => spec.actions ?? 0, takeMouse: () => ({ x: 0, y: 0 }),
      isLocked: () => false, held: () => false,
    };
    if (spec.actions) { const a = spec.actions; spec.actions = 0; fakeInput.takeActions = () => a; }
  },
  setWanted(n) { state.wanted = n; state.unseenTime = 0; },
  setCamVista(v) { camVista = v; },
  setCamYaw(v) { camYaw = v; },
  beginPlay() { beginPlay(false); },
  teleport(x, z) { player.x = x; player.z = z; if (player.inCar) { player.inCar.x = x; player.inCar.z = z; syncCar(player.inCar); } },
  enterFirstCar() {
    const car = traffic.cars.find((c) => c.kind === 'parked') ?? traffic.cars[0];
    player.x = car.x; player.z = car.z; tryInteract();
    return car;
  },
  enterCar(car) { player.x = car.x; player.z = car.z; tryInteract(); return player.inCar; },
};
window.__game = gameApi;

if (shot) {
  stageShot(shot, gameApi);
  refreshHud();
  // Banners are wall-clock timed: give the mission intro its seconds to
  // fade (the staged 'end' banner is meant to stay), then paint.
  const stagedAt = performance.now();
  const settleMs = shot === 'end' ? 0 : 6100;
  let painted = 0;
  function paint() {
    refreshHud();
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 3 || performance.now() - stagedAt < settleMs) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else {
  // Title vista: a slow orbit over the harbour while the menu is up.
  camVista = { x: 90, y: 52, z: 150, tx: -20, ty: 4, tz: 30 };
  const vistaTimer = setInterval(() => {
    if (state.screen !== 'title') { camVista = null; clearInterval(vistaTimer); return; }
    const t = performance.now() / 26000;
    camVista = { x: Math.cos(t) * 150, y: 54, z: Math.sin(t) * 150, tx: 0, ty: 2, tz: 0 };
  }, 50);
  requestAnimationFrame(frame);
}
