// All sound is synthesized with WebAudio — no audio assets. A lazy context
// (created on the first user gesture), a soft engine hum whose pitch follows
// the car's speed, two-tone police sirens, gunshots, pickup chimes, a
// mission-complete sting and UI clicks.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }

  function noise(dur, vol = 0.2, freq = 1200) {
    const c = ensure(); if (!c) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }

  return {
    unlock() { ensure(); },
    click() { tone(660, 0.06, 'square', 0.05); },
    shot() { noise(0.09, 0.25, 900); tone(140, 0.08, 'sawtooth', 0.1, -80); },
    hit() { tone(220, 0.07, 'triangle', 0.12, -60); },
    crash(intensity = 1) { noise(0.18, 0.2 * intensity, 500); tone(80, 0.16, 'sine', 0.16 * intensity, -30); },
    pickup() { tone(880, 0.09, 'sine', 0.12); setTimeout(() => tone(1320, 0.12, 'sine', 0.12), 70); },
    cash() { tone(1046, 0.07, 'square', 0.07); setTimeout(() => tone(1568, 0.1, 'square', 0.07), 60); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 95)); },
    missionFail() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.12), i * 110)); },
    busted() { [660, 660, 440].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'square', 0.09), i * 130)); },
    setEngine(speedRatio, driving) {
      const c = ensure(); if (!c) return;
      if (driving && !engineOsc) {
        engineOsc = c.createOscillator(); engineGain = c.createGain();
        engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.0;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        engineOsc.connect(f).connect(engineGain).connect(c.destination); engineOsc.start();
      }
      if (engineOsc && engineGain) {
        engineOsc.frequency.value = 55 + speedRatio * 165;
        engineGain.gain.value = driving ? 0.028 + speedRatio * 0.03 : 0.0;
      }
    },
    setSiren(active, dt) {
      const c = ensure(); if (!c) return;
      if (active && !sirenOsc) {
        sirenOsc = c.createOscillator(); sirenGain = c.createGain();
        sirenOsc.type = 'triangle'; sirenGain.gain.value = 0.018;
        sirenOsc.connect(sirenGain).connect(c.destination); sirenOsc.start();
      }
      if (sirenOsc) {
        sirenTimer += dt;
        sirenOsc.frequency.value = (sirenTimer % 0.9) < 0.45 ? 720 : 960;
        if (!active) { try { sirenOsc.stop(); } catch { /* already stopped */ } sirenOsc = null; sirenGain = null; }
      }
    },
  };
}
