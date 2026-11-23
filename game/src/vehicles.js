// Cars: one mesh factory for every vehicle in Port Solenne, the traffic
// system that drives citizens around the grid, parked cars waiting to be
// borrowed, and the harbour patrol — police cars that spawn with the wanted
// level, hunt the player, ram, and try to hold them still for a bust.
import * as THREE from 'three';
import { CAR, CAR_COLORS } from './config.js';
import { LANE, ROAD_LINES } from './world.js';

const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
const wheelMat = new THREE.MeshLambertMaterial({ color: 0x17181c });
const glassMat = new THREE.MeshLambertMaterial({ color: 0x22384a });

export function makeCarMesh(color, isPolice = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f2f2 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.3), paint);
  body.position.y = 0.58; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.52, 2.0), glassMat);
  cabin.position.set(0, 1.08, -0.25); group.add(cabin);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.18, 4.34), new THREE.MeshLambertMaterial({ color: isPolice ? 0x22262e : 0x2b2f36 }));
  trim.position.y = 0.34; group.add(trim);
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(wx, 0.36, wz); group.add(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const s of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), lightMat);
    head.position.set(s, 0.62, -2.16); group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xd7263d }));
    tail.position.set(s, 0.62, 2.16); group.add(tail);
  }
  if (isPolice) {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2e4d }));
    red.position.x = -0.3; bar.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2e6bff }));
    blue.position.x = 0.3; bar.add(blue);
    bar.position.set(0, 1.42, -0.25); group.add(bar);
    group.userData.lightBar = bar;
  }
  return group;
}

function placeCar(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}

/** Heading for travel: axis 'x' dir +1 heads -z-forward? Meshes face -z. */
function headingFor(axis, dir) {
  if (axis === 'x') return dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  return dir > 0 ? Math.PI : 0;
}

function laneCoordFor(axis, dir, line) {
  // Right-hand traffic: eastbound rides the south lane, and so on.
  if (axis === 'x') return line + (dir > 0 ? LANE : -LANE);
  return line + (dir > 0 ? -LANE : LANE);
}

export function createTraffic(scene, rng, count = 13) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const dir = rng.chance(0.5) ? 1 : -1;
    const line = rng.pick(ROAD_LINES);
    const along = rng.range(-125, 125);
    const mesh = makeCarMesh(rng.pick(CAR_COLORS));
    scene.add(mesh);
    const car = {
      kind: 'traffic', mesh, axis, dir, line,
      x: axis === 'x' ? along : laneCoordFor('z', dir, line),
      z: axis === 'x' ? laneCoordFor('x', dir, line) : along,
      heading: headingFor(axis, dir), speed: 0, cruise: rng.range(8, 12.5),
      color: 0, stolen: false, health: 100,
    };
    if (axis === 'x') car.x = along; else car.z = along;
    placeCar(car); cars.push(car);
  }
  // Parked cars: roadside and plaza stock the player can take.
  const parkedSpots = [[-88, 94.5, 0.4], [30, -121, 1.8], [121, 30, -1.2], [-121, -30, 0.9], [64, 121, 2.6], [-30, 121, -0.6], [88, -88, 1.4], [-64, -121, 0.2], [121, -64, 2.2], [6, 70, -1.9]];
  for (const [x, z, h] of parkedSpots) {
    const mesh = makeCarMesh(rng.pick(CAR_COLORS));
    scene.add(mesh);
    const car = { kind: 'parked', mesh, axis: 'x', dir: 1, line: 0, x, z, heading: h, speed: 0, cruise: 0, health: 100 };
    placeCar(car); cars.push(car);
  }

  function update(dt, obstacles) {
    for (const car of cars) {
      if (car.kind !== 'traffic' || car.driverless) continue;
      // Slow for anything ahead in the direction of travel.
      let wanted = car.cruise;
      for (const o of obstacles) {
        const ahead = car.axis === 'x' ? (o.x - car.x) * car.dir : (o.z - car.z) * car.dir;
        const side = car.axis === 'x' ? Math.abs(o.z - car.z) : Math.abs(o.x - car.x);
        if (ahead > 0 && ahead < 8 && side < 2.4) wanted = Math.min(wanted, ahead < 4 ? 0 : car.cruise * 0.4);
      }
      car.speed += Math.max(-18 * dt, Math.min(9 * dt, wanted - car.speed));
      const move = car.speed * dt * car.dir;
      if (car.axis === 'x') car.x += move; else car.z += move;
      // At a crossing, sometimes turn onto the crossing road: the axis
      // swaps, the road line becomes the crossing line, and the car snaps
      // to that road's correct right-hand lane.
      const cross = car.axis === 'x' ? car.x : car.z;
      for (const line of ROAD_LINES) {
        if (Math.abs(cross - line) < Math.abs(move) + 0.01 && Math.abs(car.speed) > 1) {
          if (rng.chance(0.34)) {
            const newDir = rng.chance(0.5) ? 1 : -1;
            if (car.axis === 'x') {
              car.axis = 'z'; car.dir = newDir; car.line = line;
              car.x = laneCoordFor('z', newDir, line);
            } else {
              car.axis = 'x'; car.dir = newDir; car.line = line;
              car.z = laneCoordFor('x', newDir, line);
            }
          }
          break;
        }
      }
      if (car.x > 150) car.x = -150; if (car.x < -150) car.x = 150;
      if (car.z > 150) car.z = -150; if (car.z < -150) car.z = 150;
      car.heading = headingFor(car.axis, car.dir);
      placeCar(car);
    }
  }
  return { cars, update };
}

/** Arcade driving for whichever car the player sits in. */
export function driveCar(car, input, dt) {
  const axis = input.axis();
  const throttle = -axis.z; // W is -z in input space = forward
  const steer = axis.x;
  if (throttle > 0) car.speed += CAR.accel * dt * (1 - Math.max(0, car.speed) / CAR.maxSpeed);
  else if (throttle < 0) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.7) * dt;
  else car.speed -= car.speed * 0.55 * dt;
  if (input.brake()) car.speed -= car.speed * 3.2 * dt;
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  if (Math.abs(car.speed) > 0.05) {
    const grip = Math.min(1, Math.abs(car.speed) / 7);
    car.heading -= steer * CAR.turn * grip * dt * Math.sign(car.speed) * (1 - Math.min(0.55, Math.abs(car.speed) / CAR.maxSpeed * 0.55));
  }
  car.x += -Math.sin(car.heading) * car.speed * dt;
  car.z += -Math.cos(car.heading) * car.speed * dt;
  placeCar(car);
  return car.speed;
}

export function syncCar(car) { placeCar(car); }

export function createPolice(scene) {
  const units = [];
  let flash = 0;
  function spawnNear(x, z, rng) {
    const angle = rng.range(0, Math.PI * 2);
    const mesh = makeCarMesh(0xffffff, true);
    scene.add(mesh);
    const unit = { kind: 'police', mesh, x: x + Math.cos(angle) * 55, z: z + Math.sin(angle) * 55, heading: 0, speed: 0, health: 100 };
    placeCar(unit); units.push(unit);
  }
  function update(dt, target, wanted, rng, events) {
    flash += dt;
    const desired = wanted <= 0 ? 0 : Math.min(2 + wanted, 6);
    while (units.length < desired) spawnNear(target.x, target.z, rng);
    while (units.length > desired) { const u = units.pop(); scene.remove(u.mesh); }
    let nearest = Infinity;
    let sees = false;
    for (const u of units) {
      const dx = target.x - u.x; const dz = target.z - u.z;
      const dist = Math.hypot(dx, dz);
      nearest = Math.min(nearest, dist);
      if (dist < 70) sees = true;
      const wantHeading = Math.atan2(-dx, -dz);
      let diff = wantHeading - u.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const topSpeed = target.inCar ? 33 : 17;
      const want = dist > 4 ? topSpeed : 0;
      u.speed += Math.max(-20 * dt, Math.min(11 * dt, want - u.speed));
      u.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff)) * Math.min(1, Math.abs(u.speed) / 6 + 0.25);
      const nx = u.x + -Math.sin(u.heading) * u.speed * dt;
      const nz = u.z + -Math.cos(u.heading) * u.speed * dt;
      u.x = nx; u.z = nz;
      // Keep units from stacking inside one another.
      for (const other of units) {
        if (other === u) continue;
        const sx = u.x - other.x; const sz = u.z - other.z;
        const sd = Math.hypot(sx, sz);
        if (sd > 0.01 && sd < 3.6) { u.x += (sx / sd) * (3.6 - sd) * 0.5; u.z += (sz / sd) * (3.6 - sd) * 0.5; }
      }
      if (dist < 3.4 && Math.abs(target.speed ?? 0) < 6) events.ram = true;
      if (u.mesh.userData.lightBar) u.mesh.userData.lightBar.visible = Math.floor(flash * 6) % 2 === 0;
      placeCar(u);
    }
    return { nearest, sees, count: units.length };
  }
  return { units, update };
}
