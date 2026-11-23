// VICE HARBOR tuning: the city grid, the player, the cars, the law and the
// story. Every number the other files share lives here so the feel of the
// game can be retuned in one place.
export const STEP = 1 / 60;
export const SAVE_KEY = 'vice-harbor-save-v1';
export const BEST_KEY = 'vice-harbor-best-v1';

// Port Solenne is a square grid: BLOCKS x BLOCKS city blocks, each BLOCK
// metres across, split by roads ROAD wide. The south edge is the marina.
export const BLOCKS = 5;
export const BLOCK = 38;
export const ROAD = 13;
export const PITCH = BLOCK + ROAD;
export const CITY_MIN = -(BLOCKS * PITCH) / 2;
export const CITY_MAX = (BLOCKS * PITCH) / 2;
export const WORLD_EDGE = CITY_MAX + 26;

export const PLAYER = {
  walkSpeed: 5.2,
  runSpeed: 8.6,
  radius: 0.55,
  health: 100,
  turnRate: 10,
};

export const CAR = {
  accel: 15,
  brake: 26,
  reverse: 7,
  maxSpeed: 34,
  maxReverse: 10,
  grip: 7.5,
  turn: 1.65,
  radius: 1.55,
};

export const WANTED = {
  // Seconds of staying unspotted (per star) before one star fades.
  coolPerStar: 9,
  bustFillSeconds: 2.6,
  bustRange: 7,
};

export const CRIMES = {
  steal: 1,
  shoot: 1,
  hitPed: 2,
  hitCar: 1,
  hitCop: 2,
};

// The story of Jules Marlowe, a broke courier in Port Solenne who owes the
// Marigold Diner's owner, Rosa Venn, for the boat his brother sank. Each
// mission is a list of legs; a leg ends at a marker (reach), by collecting
// pickups (collect), by shaking the police (escape) or by checkpoints (race).
export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    giver: 'Rosa Venn',
    intro: 'Rosa: "Jules, my delivery hatchback is parked by the diner. Take it and bring me the keys back — no, bring YOURSELF back. The car stays mine."',
    reward: 150,
    legs: [
      { kind: 'reach', label: 'Get to Rosa\'s hatchback by the Marigold Diner', x: -88, z: 88, r: 5, needCar: false },
      { kind: 'reach', label: 'Drive Rosa\'s car back to the Marigold Diner', x: -104, z: 120, r: 8, needCar: true },
    ],
  },
  {
    id: 'hot-package',
    title: 'Hot Package',
    giver: 'Rosa Venn',
    intro: 'Rosa: "A parcel for the lighthouse keeper. It ticks. Do not ask. Ninety seconds, and the harbour patrol must not see you take it."',
    reward: 300,
    legs: [
      { kind: 'reach', label: 'Pick up the ticking parcel at Pier 9', x: 96, z: 118, r: 5, crime: 2 },
      { kind: 'reach', label: 'Deliver the parcel to the lighthouse point', x: -118, z: -96, r: 7, timer: 95 },
    ],
  },
  {
    id: 'dock-crates',
    title: 'Dock Crates',
    giver: 'Old Fenner',
    intro: 'Fenner: "Three of my crates fell off a truck. Funny how they landed all over town. Bring them home, lad."',
    reward: 380,
    legs: [
      { kind: 'collect', label: 'Recover Fenner\'s lost crates', count: 3, points: [[58, -62], [-34, 18], [104, 44]] },
    ],
  },
  {
    id: 'lose-the-heat',
    title: 'Lose the Heat',
    giver: 'Lucia Park',
    intro: 'Lucia: "You are famous now, Jules. Get the patrol angry, then make them forget you ever existed. End at my garage."',
    reward: 450,
    legs: [
      { kind: 'escape', label: 'Raise your wanted level, then lose the police and reach Lucia\'s garage', x: 108, z: -108, r: 8 },
    ],
  },
  {
    id: 'night-fare',
    title: 'Night Fare',
    giver: 'Lucia Park',
    intro: 'Lucia: "Pick me up at the Neptune Hotel. Drive gentle. My dress costs more than your boat did."',
    reward: 550,
    legs: [
      { kind: 'reach', label: 'Pick up Lucia at the Neptune Hotel', x: 12, z: -104, r: 6 },
      { kind: 'reach', label: 'Drive Lucia to Marina Gate before the ferry leaves', x: 118, z: 118, r: 8, timer: 80 },
    ],
  },
  {
    id: 'harbour-king',
    title: 'Harbour King',
    giver: 'Rosa Venn',
    intro: 'Rosa: "Last run, Jules. Hit every checkpoint around Port Solenne and the debt is dead. The whole harbour will watch."',
    reward: 1200,
    legs: [
      { kind: 'race', label: 'Hit every checkpoint, then finish at the Marigold Diner', points: [[-110, -110], [0, -118], [112, -60], [112, 60], [0, 118]], finish: [-104, 104] },
    ],
  },
];

export const SHELL_COUNT = 20;
export const CAR_COLORS = [0xd94f30, 0x2e86ab, 0xf2c14e, 0x7fb069, 0xe8e8ec, 0x30343f, 0x9b5de5, 0x00b4a2, 0xf15bb5, 0x4361ee];
export const PED_COLORS = [0xf2c14e, 0xef476f, 0x06d6a0, 0x118ab2, 0xffd166, 0xe8e8ec, 0x9b5de5, 0xf78c6b];
export const BUILDING_COLORS = [0xf4e3c1, 0xeec9a3, 0xdba98a, 0xc9d6df, 0xf0ead6, 0xe3b7a0, 0xb8d0c8, 0xf5d7a1];
