// Jules Marlowe on foot: a third-person walker with camera-relative WASD,
// a sprint, simple procedural bob, building collision, and a pistol he
// probably should not have. In a car this module just hides him.
import { PLAYER, WORLD_EDGE } from './config.js';
import { collideCircle } from './world.js';
import { makePerson } from './pedestrians.js';

export function createPlayer(scene, colliders) {
  const mesh = makePerson(0xd94f30);
  scene.add(mesh);
  const player = {
    mesh, x: -96, z: 118, heading: 0.6, health: PLAYER.health,
    inCar: null, speedNow: 0, bob: 0, shotCooldown: 0,
  };

  function update(dt, input, camYaw) {
    if (player.inCar) { mesh.visible = false; return; }
    mesh.visible = true;
    const axis = input.axis();
    const moving = axis.x !== 0 || axis.z !== 0;
    const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    player.speedNow = moving ? speed : 0;
    if (moving) {
      const len = Math.hypot(axis.x, axis.z) || 1;
      const sin = Math.sin(camYaw); const cos = Math.cos(camYaw);
      // Camera-relative: forward on screen is away from the camera, so W
      // (axis.z = -1) walks along the camera's forward (-sin, -cos).
      const wx = (axis.x * cos + axis.z * sin) / len;
      const wz = (-axis.x * sin + axis.z * cos) / len;
      player.x += wx * speed * dt;
      player.z += wz * speed * dt;
      const targetHeading = Math.atan2(-wx, -wz);
      let diff = targetHeading - player.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      player.heading += diff * Math.min(1, PLAYER.turnRate * dt);
      player.bob += dt * speed * 1.6;
    }
    const [cx, cz] = collideCircle(colliders, player.x, player.z, PLAYER.radius);
    player.x = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, cx));
    player.z = Math.max(-WORLD_EDGE, Math.min(WORLD_EDGE, cz));
    mesh.position.set(player.x, Math.abs(Math.sin(player.bob)) * 0.06, player.z);
    mesh.rotation.y = player.heading;
    player.shotCooldown = Math.max(0, player.shotCooldown - dt);
  }

  return { player, update };
}
