// Deterministic screenshot scenes behind ?shot=start|play|chase|end.
// Each stages the real game — same city, same traffic, same patrol — with
// scripted input run through the fixed-step loop, so the frame is a moment
// the game itself produced and the same seed always gives the same frame.
import { STEP } from './config.js';

function run(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) G.step(STEP);
}

export function stageShot(name, G) {
  if (name === 'play') {
    // First Wheels, completed at speed: Jules reaches Rosa's hatchback on
    // foot (leg one), then drives the marina road west toward the diner
    // with three stars up and the patrol closing in behind.
    G.beginPlay();
    G.teleport(-88, 90);
    run(G, 0.4);
    const car = G.traffic.cars[0];
    car.x = -28; car.z = 124.2; car.heading = Math.PI / 2; car.speed = 0;
    G.enterCar(car);
    G.setFakeInput({ z: -1 });
    run(G, 1.6);
    G.setWanted(3);
    run(G, 2.0);
    const lead = G.police.units[0];
    if (lead) { lead.x = car.x + 10; lead.z = car.z - 4.5; lead.speed = 21; }
    run(G, 0.5);
    G.setFakeInput(null);
    return;
  }
  if (name === 'chase') {
    // On foot in the Marigold Quarter at four stars: Jules runs, two patrol
    // cars cut the corner behind him, the bust pressure is on.
    G.beginPlay();
    G.teleport(-25.5, 34);
    G.setCamYaw(0);
    G.setWanted(4);
    run(G, 1.2);
    const p = G.focus();
    for (let i = 0; i < Math.min(2, G.police.units.length); i += 1) {
      const u = G.police.units[i];
      u.x = p.x - 2 + i * 4.5; u.z = p.z + 13 + i * 5; u.speed = 7;
    }
    G.setFakeInput({ z: -1, run: true });
    run(G, 2.1);
    G.setFakeInput(null);
    return;
  }
  if (name === 'end') {
    // The debt is dead: story complete, cash banked, Jules at Marina Gate
    // beside the car that carried the last run.
    G.beginPlay();
    G.missions.startMission(6);
    G.state.cash = 3260; G.state.storyDone = true;
    G.teleport(60, 136);
    G.player.heading = 2.6;
    const car = G.traffic.cars.find((c) => c.kind === 'parked');
    if (car) { car.x = 54; car.z = 133; car.heading = 0.8; car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading; }
    G.hud.showBanner('HARBOUR KING', 'The debt is dead. Port Solenne is yours, Jules — $3,260 banked, story complete.', 60);
    G.setCamVista({ x: 43, y: 5.5, z: 149, tx: 62, ty: 1.5, tz: 133 });
    run(G, 1.2);
    return;
  }
  // start: the title over a living city — traffic flowing, palms, the
  // harbour behind the menu.
  G.setCamVista({ x: 74, y: 30, z: 158, tx: -30, ty: 3, tz: 20 });
  run(G, 2.5);
}
