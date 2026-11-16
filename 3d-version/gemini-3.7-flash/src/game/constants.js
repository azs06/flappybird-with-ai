export const GAME_STATES = {
  MENU: 'MENU',
  READY: 'READY',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
  PAUSED: 'PAUSED'
};

export const CAMERA_MODES = {
  THIRD_PERSON: 'THIRD_PERSON', // Behind bird (Dynamic action)
  SIDE_VIEW: 'SIDE_VIEW',       // Classic 2.5D view
  FIRST_PERSON: 'FIRST_PERSON', // From bird eyes
  CINEMATIC: 'CINEMATIC'        // Orbit / showcase
};

export const THEMES = {
  SUNSET: {
    id: 'SUNSET',
    name: 'Sunset Highlands',
    skyTop: 0xff7e5f,
    skyBottom: 0xfeb47b,
    fogColor: 0xffaa77,
    fogDensity: 0.008,
    ambientLight: 0xffeedd,
    ambientIntensity: 0.7,
    sunLight: 0xffd194,
    sunIntensity: 1.6,
    sunPosition: [40, 60, -80],
    groundColor: 0x4a7c59,
    pipeColor: 0x2e8b57,
    pipeRimColor: 0x3cb371,
    pipeAccentColor: 0xffd700,
    accentColor: '#ff9900',
    particleColor: 0xffddaa,
    musicTheme: 'SUNSET'
  },
  CYBERPUNK: {
    id: 'CYBERPUNK',
    name: 'Neo Cyber 2099',
    skyTop: 0x050518,
    skyBottom: 0x1a0933,
    fogColor: 0x140a28,
    fogDensity: 0.01,
    ambientLight: 0x6644aa,
    ambientIntensity: 0.5,
    sunLight: 0x00ffff,
    sunIntensity: 1.8,
    sunPosition: [-30, 50, -60],
    groundColor: 0x0a0a14,
    pipeColor: 0x151525,
    pipeRimColor: 0x00ffff,
    pipeAccentColor: 0xff007f,
    accentColor: '#00ffff',
    particleColor: 0x00ffff,
    musicTheme: 'CYBER'
  },
  NEBULA: {
    id: 'NEBULA',
    name: 'Cosmic Nebula',
    skyTop: 0x020111,
    skyBottom: 0x19053b,
    fogColor: 0x100525,
    fogDensity: 0.006,
    ambientLight: 0x9b5de5,
    ambientIntensity: 0.6,
    sunLight: 0xf15bb5,
    sunIntensity: 1.5,
    sunPosition: [0, 80, -100],
    groundColor: 0x120826,
    pipeColor: 0x3a0ca3,
    pipeRimColor: 0x4cc9f0,
    pipeAccentColor: 0xf72585,
    accentColor: '#b5179e',
    particleColor: 0x4cc9f0,
    musicTheme: 'SPACE'
  },
  VOLCANIC: {
    id: 'VOLCANIC',
    name: 'Infernal Canyon',
    skyTop: 0x1a0505,
    skyBottom: 0x4a1205,
    fogColor: 0x3d0d05,
    fogDensity: 0.009,
    ambientLight: 0xff5533,
    ambientIntensity: 0.6,
    sunLight: 0xff3300,
    sunIntensity: 2.0,
    sunPosition: [50, 40, -50],
    groundColor: 0x221111,
    pipeColor: 0x2b1c1c,
    pipeRimColor: 0xff4500,
    pipeAccentColor: 0xffaa00,
    accentColor: '#ff4500',
    particleColor: 0xff5500,
    musicTheme: 'VOLCANO'
  }
};

export const SKINS = [
  {
    id: 'classic',
    name: 'Chonky Pip',
    bodyColor: 0xffcb05,
    bellyColor: 0xfff3a0,
    wingColor: 0xe6a800,
    beakColor: 0xff5722,
    eyeColor: 0x222222,
    trailColor: 0xffcb05,
    price: 0,
    description: 'The legendary golden feathered flyer.'
  },
  {
    id: 'cyber',
    name: 'Cyber Drone-7',
    bodyColor: 0x1e293b,
    bellyColor: 0x0f172a,
    wingColor: 0x06b6d4,
    beakColor: 0xf43f5e,
    eyeColor: 0x00ffff,
    trailColor: 0x00ffff,
    price: 30,
    description: 'High-speed synthetic aerodynamic reconnaissance bird.'
  },
  {
    id: 'phoenix',
    name: 'Solar Phoenix',
    bodyColor: 0xd90429,
    bellyColor: 0xff5400,
    wingColor: 0xffaa00,
    beakColor: 0xffdd00,
    eyeColor: 0xffffff,
    trailColor: 0xff5400,
    price: 60,
    description: 'Reborn from astral fire with blazing ember trails.'
  },
  {
    id: 'midnight',
    name: 'Shadow Raven',
    bodyColor: 0x181824,
    bellyColor: 0x2a2a3c,
    wingColor: 0x4834d4,
    beakColor: 0x706fd3,
    eyeColor: 0xa55eea,
    trailColor: 0x8854d0,
    price: 100,
    description: 'Master of stealth with amethyst-infused feathers.'
  },
  {
    id: 'gold',
    name: 'King Midas',
    bodyColor: 0xffd700,
    bellyColor: 0xffea79,
    wingColor: 0xd4af37,
    beakColor: 0xff8c00,
    eyeColor: 0x111111,
    trailColor: 0xffd700,
    price: 200,
    description: 'Pure 24-karat solid gold with royalty swagger.'
  }
];

export const HATS = [
  { id: 'none', name: 'None', price: 0 },
  { id: 'tophat', name: 'Gentleman Hat', price: 20 },
  { id: 'goggles', name: 'Aviator Goggles', price: 40 },
  { id: 'crown', name: 'Royal Crown', price: 80 },
  { id: 'viking', name: 'Viking Helmet', price: 120 }
];

export const TRAILS = [
  { id: 'sparkles', name: 'Gold Sparkles', color: 0xffd700, price: 0 },
  { id: 'rainbow', name: 'Prism Rainbow', color: 0xff44ff, price: 35 },
  { id: 'plasma', name: 'Cyber Plasma', color: 0x00ffff, price: 60 },
  { id: 'fire', name: 'Dragon Fire', color: 0xff3300, price: 90 },
  { id: 'stars', name: 'Stardust', color: 0xffffff, price: 150 }
];

export const PHYSICS = {
  GRAVITY: -34.0,
  FLAP_VELOCITY: 11.5,
  MAX_FALL_SPEED: -18.0,
  FORWARD_SPEED: 14.0,
  SPEED_INCREMENT_PER_SCORE: 0.12,
  MAX_FORWARD_SPEED: 26.0,
  BIRD_RADIUS: 0.7,
  PIPE_SPACING_Z: 17.0,
  PIPE_GAP_HEIGHT: 5.6,
  PIPE_MIN_Y: -6.0,
  PIPE_MAX_Y: 7.0,
  PIPE_RADIUS: 1.35,
  WORLD_BOUNDS_Y: [-11.0, 15.0]
};

export const POWERUPS = {
  SHIELD: {
    id: 'SHIELD',
    name: 'Energy Shield',
    color: 0x38bdf8,
    duration: 8.0,
    icon: '🛡️',
    description: 'Absorbs 1 crash without dying!'
  },
  SLOW_MO: {
    id: 'SLOW_MO',
    name: 'Chrono Time Warp',
    color: 0xa855f7,
    duration: 5.0,
    icon: '⏳',
    description: 'Slows down time for precision flight.'
  },
  MAGNET: {
    id: 'MAGNET',
    name: 'Coin Magnet',
    color: 0xfacc15,
    duration: 7.0,
    icon: '🧲',
    description: 'Attracts all coins and rings automatically.'
  },
  MINI: {
    id: 'MINI',
    name: 'Mini Feather',
    color: 0x4ade80,
    duration: 6.0,
    icon: '🪶',
    description: 'Shrinks bird by 50% for effortless clearance.'
  }
};
