// Keyboard and mouse for a desktop open-world game: WASD/arrows to move or
// drive, Shift to run, Space to brake/jump, E to enter or leave a car,
// mouse to orbit the camera and click to fire. Also collects one-shot
// actions (pause, confirm, interact) the loop drains each frame.
export const ACTION_PAUSE = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_INTERACT = 4;

export function createInput(target) {
  const keys = new Set();
  let actions = 0;
  let mouseDX = 0;
  let mouseDY = 0;
  let firing = false;
  let locked = false;

  const down = (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyE' || event.code === 'KeyF') actions |= ACTION_INTERACT;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  };
  const up = (event) => keys.delete(event.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  target.addEventListener('mousedown', (event) => { if (event.button === 0) firing = true; });
  window.addEventListener('mouseup', (event) => { if (event.button === 0) firing = false; });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === target; });
  document.addEventListener('mousemove', (event) => {
    if (!locked) return;
    mouseDX += event.movementX || 0;
    mouseDY += event.movementY || 0;
  });

  return {
    held(code) { return keys.has(code); },
    axis() {
      const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      return { x, z };
    },
    run() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    brake() { return keys.has('Space'); },
    firing() { return firing; },
    takeActions() { const a = actions; actions = 0; return a; },
    takeMouse() { const d = { x: mouseDX, y: mouseDY }; mouseDX = 0; mouseDY = 0; return d; },
    lock() { if (!locked) target.requestPointerLock?.(); },
    isLocked() { return locked; },
  };
}
