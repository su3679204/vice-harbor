# vice-harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/su3679204/vice-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/su3679204/vice-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**VICE HARBOR** — an original open-world crime game in three.js, set in Port Solenne, a sun-soaked harbour city of five-by-five blocks, a marina, a lighthouse point and one very patient diner owner. You are Jules Marlowe, a broke courier who owes Rosa Venn for a sunken boat. Run her six jobs — first wheels, a ticking parcel, lost dock crates, losing the harbour patrol, a night fare, and a checkpoint race around the whole city — pay the debt, and become the Harbour King.

Explore on foot or by car. Traffic flows around the grid, pedestrians stroll (and flee), cars can be borrowed with E, crimes raise a five-star wanted level, and the harbour patrol spawns, chases, rams and tries to hold you for a bust. Combat is a click-fired pistol on foot. The HUD carries a live circular minimap (roads, traffic, pedestrians, flashing police, the gold mission target), wanted stars, cash, health, a bust meter, speed and district names. Twenty neon shells hide on the pavements at $50 each. Progress — cash, story, shells — saves to localStorage after every mission; busted and wasted both cost you and put you back on the street. All sound is synthesized WebAudio: engine, sirens, gunfire, crashes, pickups and mission stings. No assets, no network: every file is under `game/`, three.js vendored as its minified build.

Controls: WASD move/drive, mouse camera (click locks the pointer), E enter/leave car, Shift sprint, click shoot, Space handbrake, P pause, M mute.

## Run it

```sh
node serve.ts
# open http://localhost:8080 — or serve game/ with any static file server
```

Hand the entry in (Node 22, standard library only):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Deterministic screenshots: `game/index.html?shot=play|chase|start|end&seed=1` stages a real scene through the fixed-step loop and sets `window.__shotReady`.

Layout: `game/src/` splits one job per file — `world.js` builds Port Solenne, `vehicles.js` makes cars, traffic and the patrol, `pedestrians.js` the citizens, `player.js` Jules on foot, `missions.js` Rosa's six jobs and the shells, `hud.js` the HUD and minimap, `audio.js` the synthesized sound, `save.js` the localStorage save, `shots.js` the screenshot scenes, `main.js` the loop that wires it all together.

MIT licensed. Original city, characters, vehicles, names, story, art and sounds — nothing from any commercial game.

---

Entered on [make.fun](https://make.fun/?ref=a866kr6r&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
