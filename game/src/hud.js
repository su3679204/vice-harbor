// The HUD: wanted stars, cash, health, speed, the mission banner and
// objective line, toasts — and the minimap, a live canvas map of Port
// Solenne with roads, the player, traffic, police and the mission target.
import { ROAD_LINES } from './world.js';

const MAP_WORLD = 160;

export function createHud() {
  const el = (id) => document.getElementById(id);
  const wanted = el('wanted'); const cash = el('cash'); const healthFill = el('health-fill');
  const objective = el('objective'); const missionTitle = el('mission-title');
  const timer = el('timer'); const speed = el('speed'); const zone = el('zone-name');
  const banner = el('banner'); const bannerTitle = el('banner-title'); const bannerCopy = el('banner-copy');
  const toast = el('toast'); const bustWrap = el('bust-wrap'); const bustFill = el('bust-fill');
  const map = el('minimap'); const mg = map.getContext('2d');
  let bannerUntil = 0; let toastUntil = 0;

  function showBanner(title, copy, seconds = 4) {
    bannerTitle.textContent = title; bannerCopy.textContent = copy;
    banner.hidden = false; bannerUntil = performance.now() + seconds * 1000;
  }
  function showToast(text, seconds = 2.6) {
    toast.textContent = text; toast.hidden = false;
    toastUntil = performance.now() + seconds * 1000;
  }

  function drawMap(view) {
    const S = map.width; const half = S / 2;
    const toMap = (x, z) => [half + (x / MAP_WORLD) * half, half + (z / MAP_WORLD) * half];
    mg.fillStyle = '#20303a'; mg.fillRect(0, 0, S, S);
    mg.strokeStyle = '#4a5a64'; mg.lineWidth = 5;
    for (const line of ROAD_LINES) {
      const [a] = toMap(line, 0); mg.beginPath(); mg.moveTo(a, 0); mg.lineTo(a, S); mg.stroke();
      const [, b] = toMap(0, line); mg.beginPath(); mg.moveTo(0, b); mg.lineTo(S, b); mg.stroke();
    }
    mg.fillStyle = '#2e86ab'; mg.fillRect(0, toMap(0, 132)[1], S, S);
    const dot = (x, z, r, color) => { const [mx, my] = toMap(x, z); mg.fillStyle = color; mg.beginPath(); mg.arc(mx, my, r, 0, 7); mg.fill(); };
    for (const c of view.traffic) dot(c.x, c.z, 2, '#aeb8bf');
    for (const p of view.peds) dot(p.x, p.z, 1.4, '#e8e8ec');
    for (const u of view.police) dot(u.x, u.z, 3, Math.floor(performance.now() / 300) % 2 ? '#ff2e4d' : '#2e6bff');
    if (view.target) { const [tx, ty] = toMap(view.target.x, view.target.z); mg.strokeStyle = '#ffd23e'; mg.lineWidth = 2; mg.beginPath(); mg.arc(tx, ty, 6, 0, 7); mg.stroke(); }
    const [px, py] = toMap(view.player.x, view.player.z);
    mg.save(); mg.translate(px, py); mg.rotate(Math.atan2(-Math.sin(view.player.heading), -Math.cos(view.player.heading)) + Math.PI);
    mg.fillStyle = '#ffffff'; mg.beginPath(); mg.moveTo(0, -6); mg.lineTo(4, 5); mg.lineTo(-4, 5); mg.closePath(); mg.fill(); mg.restore();
  }

  return {
    showBanner, showToast,
    update(state, view, dt) {
      void dt;
      wanted.textContent = state.wanted > 0 ? '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted) : '';
      wanted.classList.toggle('hot', state.wanted >= 3);
      cash.textContent = `$${state.cash}`;
      healthFill.style.width = `${Math.max(0, state.health)}%`;
      healthFill.style.background = state.health < 30 ? '#d7263d' : '#06d6a0';
      objective.textContent = state.objective;
      missionTitle.textContent = state.missionTitle;
      timer.textContent = state.timer > 0 ? `⏱ ${Math.ceil(state.timer)}s` : '';
      timer.classList.toggle('urgent', state.timer > 0 && state.timer < 15);
      speed.textContent = state.inCar ? `${Math.round(Math.abs(state.carSpeed) * 3.6)} km/h` : '';
      zone.textContent = state.zone;
      bustWrap.hidden = state.bust <= 0;
      bustFill.style.width = `${Math.min(100, state.bust * 100)}%`;
      if (!banner.hidden && performance.now() > bannerUntil) banner.hidden = true;
      if (!toast.hidden && performance.now() > toastUntil) toast.hidden = true;
      drawMap(view);
    },
  };
}

/** Which named district of Port Solenne a point sits in, for the HUD. */
export function zoneName(x, z) {
  if (z > 130) return 'Marina Beach';
  if (x < -55 && z < -55) return 'Lighthouse Point';
  if (x > 55 && z > 55) return 'Marina Gate';
  if (x > 55 && z < -55) return "Lucia's Heights";
  if (x < -55 && z > 55) return 'Marigold Quarter';
  if (Math.abs(x) < 30 && Math.abs(z) < 30) return 'Old Town Square';
  return 'Port Solenne';
}
