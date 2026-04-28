/**
 * Moto Trials — Level Definitions  (15 maps, 9 themes)
 * Extreme Length Edition
 */

const LEVELS = [
  { id:'desert_flats',   name:'Desert Flats',     description:'Massive repeating dunes.',            difficulty:'Easy',    diffColor:'#22c55e', bgGradient:'linear-gradient(145deg,#1a3c1a,#2d5a2d)',  emoji:'🏜️',  theme:'desert',  trackColors:{surface:'#d4882a',fill:'#b86c10',dirt:'#e8a040'}, buildTrack:buildTrack_DesertFlats },
  { id:'rocky_ridge',    name:'Rocky Ridge',      description:'Gigantic jagged peaks.',              difficulty:'Medium',  diffColor:'#f59e0b', bgGradient:'linear-gradient(145deg,#3d2a00,#6b4a10)',  emoji:'⛰️',  theme:'rocky',   trackColors:{surface:'#9a7050',fill:'#7a5030',dirt:'#c09060'}, buildTrack:buildTrack_RockyRidge },
  { id:'canyon_drop',    name:'Canyon Drop',      description:'Endless deep canyons to cross.',      difficulty:'Hard',    diffColor:'#ef4444', bgGradient:'linear-gradient(145deg,#3d0a00,#6b1a10)',  emoji:'🏔️',  theme:'canyon',  trackColors:{surface:'#c85030',fill:'#a03018',dirt:'#e06030'}, buildTrack:buildTrack_CanyonDrop },
  { id:'insane_peak',    name:'Insane Peak',      description:'Near-vertical mountain ranges.',      difficulty:'Insane',  diffColor:'#a855f7', bgGradient:'linear-gradient(145deg,#1a0030,#3d1060)',  emoji:'💀',  theme:'storm',   trackColors:{surface:'#706068',fill:'#504050',dirt:'#907080'}, buildTrack:buildTrack_InsanePeak },
  { id:'angkor_dawn',    name:'Angkor Dawn',      description:'Ancient giant stone steps.',          difficulty:'Medium',  diffColor:'#fb923c', bgGradient:'linear-gradient(145deg,#3d1a00,#7a3010)',  emoji:'🏛️',  theme:'angkor',  trackColors:{surface:'#a07840',fill:'#7a5820',dirt:'#c09848'}, buildTrack:buildTrack_AngkorDawn },
  { id:'jungle_canopy',  name:'Jungle Canopy',    description:'Wavy roots and steep drops.',         difficulty:'Hard',    diffColor:'#16a34a', bgGradient:'linear-gradient(145deg,#041404,#0a280a)',  emoji:'🌿',  theme:'jungle',  trackColors:{surface:'#386825',fill:'#254818',dirt:'#50a030'}, buildTrack:buildTrack_JungleCanopy },
  { id:'city_circuit',   name:'City Circuit',     description:'Long ramps across the skyline.',      difficulty:'Hard',    diffColor:'#60a5fa', bgGradient:'linear-gradient(145deg,#0a0828,#1a1048)',  emoji:'🏙️',  theme:'city',    trackColors:{surface:'#606070',fill:'#484855',dirt:'#808090'}, buildTrack:buildTrack_CityCircuit },
  { id:'temple_gauntlet',name:'Temple Gauntlet',  description:'Brutal stairs and sudden pits.',      difficulty:'Hard',    diffColor:'#d97706', bgGradient:'linear-gradient(145deg,#1a1008,#3a2810)',  emoji:'🗿',  theme:'ruins',   trackColors:{surface:'#908060',fill:'#706040',dirt:'#b0a070'}, buildTrack:buildTrack_TempleGauntlet },
  { id:'night_rider',    name:'Night Rider',      description:'Massive jumps under city lights.',    difficulty:'Insane',  diffColor:'#f472b6', bgGradient:'linear-gradient(145deg,#020408,#0a0818)',  emoji:'🌃',  theme:'night',   trackColors:{surface:'#282838',fill:'#181825',dirt:'#383848'}, buildTrack:buildTrack_NightRider },
  { id:'jungle_abyss',   name:'Jungle Abyss',     description:'The ultimate test of survival.',      difficulty:'Insane',  diffColor:'#4ade80', bgGradient:'linear-gradient(145deg,#010801,#040f04)',  emoji:'🕳️',  theme:'abyss',   trackColors:{surface:'#1a4010',fill:'#102808',dirt:'#286020'}, buildTrack:buildTrack_JungleAbyss },
  // ── NEW LEVELS ──────────────────────────────────────────────────────────────
  { id:'volcano_rush',   name:'Volcano Rush',     description:'Race over erupting lava flows.',      difficulty:'Hard',    diffColor:'#ff4400', bgGradient:'linear-gradient(145deg,#2d0500,#5a0a00)',  emoji:'🌋',  theme:'volcano', trackColors:{surface:'#cc3300',fill:'#8a1500',dirt:'#ff6622'}, buildTrack:buildTrack_VolcanoRush },
  { id:'snowfall_summit',name:'Snowfall Summit',  description:'Slippery ice peaks and powder slopes.',difficulty:'Hard',    diffColor:'#bae6fd', bgGradient:'linear-gradient(145deg,#0a1a2d,#102040)',  emoji:'❄️',  theme:'snow',    trackColors:{surface:'#c8d8f0',fill:'#8898b8',dirt:'#e0eeff'}, buildTrack:buildTrack_SnowfallSummit },
  { id:'coral_beach',    name:'Coral Beach',      description:'Chill waves then massive gap jumps.',  difficulty:'Medium',  diffColor:'#06b6d4', bgGradient:'linear-gradient(145deg,#002a3d,#00455a)',  emoji:'🏖️',  theme:'beach',   trackColors:{surface:'#e8c870',fill:'#c8a040',dirt:'#f0e090'}, buildTrack:buildTrack_CoralBeach },
  { id:'crystal_cave',   name:'Crystal Cave',     description:'Underground drops with tight gaps.',   difficulty:'Insane',  diffColor:'#a78bfa', bgGradient:'linear-gradient(145deg,#0a0015,#15002a)',  emoji:'💎',  theme:'cave',    trackColors:{surface:'#6040a0',fill:'#401880',dirt:'#8060c0'}, buildTrack:buildTrack_CrystalCave },
  { id:'asteroid_belt',  name:'Asteroid Belt',    description:'Gravity-defying leaps between rocks.', difficulty:'Insane',  diffColor:'#94a3b8', bgGradient:'linear-gradient(145deg,#000008,#050010)',  emoji:'🪐',  theme:'space',   trackColors:{surface:'#505060',fill:'#303040',dirt:'#707080'}, buildTrack:buildTrack_AsteroidBelt },
  // ── LEVELS 16-20 ─────────────────────────────────────────────────────────────
  { id:'toxic_swamp',    name:'Toxic Swamp',      description:'Acid pools and rotting log bridges.',  difficulty:'Hard',    diffColor:'#84cc16', bgGradient:'linear-gradient(145deg,#071200,#0e2200)',  emoji:'☠️',  theme:'toxic',   trackColors:{surface:'#5a8020',fill:'#3a6010',dirt:'#80b030'}, buildTrack:buildTrack_ToxicSwamp },
  { id:'steel_factory',  name:'Steel Factory',    description:'Grinding gears and molten metal ramps.', difficulty:'Hard',    diffColor:'#f97316', bgGradient:'linear-gradient(145deg,#100800,#201000)',  emoji:'⚙️',  theme:'factory', trackColors:{surface:'#707080',fill:'#505060',dirt:'#909090'}, buildTrack:buildTrack_SteelFactory },
  { id:'arctic_tundra',  name:'Arctic Tundra',    description:'Frozen flatlands and blizzard cliffs.',  difficulty:'Medium',  diffColor:'#7dd3fc', bgGradient:'linear-gradient(145deg,#08182a,#0e2840)',  emoji:'🧊',  theme:'arctic',  trackColors:{surface:'#aaccee',fill:'#8ab0cc',dirt:'#cce0ff'}, buildTrack:buildTrack_ArcticTundra },
  { id:'lava_tubes',     name:'Lava Tubes',       description:'Underground rivers of lava, no escape.',  difficulty:'Insane',  diffColor:'#ff6b00', bgGradient:'linear-gradient(145deg,#1a0200,#350500)',  emoji:'🔥',  theme:'lava',    trackColors:{surface:'#cc4400',fill:'#881c00',dirt:'#ff8833'}, buildTrack:buildTrack_LavaTubes },
  { id:'sky_islands',    name:'Sky Islands',      description:'Floating platforms high above the clouds.', difficulty:'Insane',  diffColor:'#67e8f9', bgGradient:'linear-gradient(145deg,#001530,#002555)',  emoji:'☁️',  theme:'sky',     trackColors:{surface:'#60b8d0',fill:'#4090a8',dirt:'#88d0e8'}, buildTrack:buildTrack_SkyIslands },
  // ── MOUNTAIN LEVELS 21-30 (The 10 Mountain Maps) ──────────────────────────────
  { id:'alpine_pass',    name:'Alpine Pass',      description:'Rolling green mountains and fresh air.',  difficulty:'Medium',  diffColor:'#34d399', bgGradient:'linear-gradient(145deg,#0a2818,#1a4830)',  emoji:'🏔️',  theme:'mountain', trackColors:{surface:'#4a8838',fill:'#2a5820',dirt:'#60a848'}, buildTrack:buildTrack_AlpinePass },
  { id:'thunder_peak',   name:'Thunder Peak',     description:'Steep jagged peaks under stormy skies.',  difficulty:'Hard',    diffColor:'#818cf8', bgGradient:'linear-gradient(145deg,#0c0c28,#1a1a40)',  emoji:'⛈️',  theme:'mountain_storm', trackColors:{surface:'#606878',fill:'#404858',dirt:'#808898'}, buildTrack:buildTrack_ThunderPeak },
  { id:'everest_climb',  name:'Everest Climb',    description:'The ultimate mountain ascent and descent.', difficulty:'Insane', diffColor:'#f0abfc', bgGradient:'linear-gradient(145deg,#1a0828,#301050)',  emoji:'🗻',  theme:'mountain_epic', trackColors:{surface:'#b8c0d0',fill:'#8890a8',dirt:'#d0d8e8'}, buildTrack:buildTrack_EverestClimb },
  { id:'highland_sprint',name:'Highland Sprint',  description:'Fast trails across the high green ridges.',difficulty:'Medium',  diffColor:'#4ade80', bgGradient:'linear-gradient(145deg,#0a2818,#1a4830)',  emoji:'🏕️',  theme:'mountain', trackColors:{surface:'#4a8838',fill:'#2a5820',dirt:'#60a848'}, buildTrack:buildTrack_HighlandSprint },
  { id:'crag_valley',    name:'Crag Valley',      description:'Deep storm valleys and sharp stone hills.',difficulty:'Hard',    diffColor:'#6366f1', bgGradient:'linear-gradient(145deg,#0c0c28,#1a1a40)',  emoji:'🌩️',  theme:'mountain_storm', trackColors:{surface:'#606878',fill:'#404858',dirt:'#808898'}, buildTrack:buildTrack_CragValley },
  { id:'summit_rush',    name:'Summit Rush',      description:'A frantic race to the highest purple peak.',difficulty:'Insane', diffColor:'#d946ef', bgGradient:'linear-gradient(145deg,#1a0828,#301050)',  emoji:'🏔️',  theme:'mountain_epic', trackColors:{surface:'#b8c0d0',fill:'#8890a8',dirt:'#d0d8e8'}, buildTrack:buildTrack_SummitRush },
  { id:'green_ridges',   name:'Green Ridges',     description:'Gentle mountain biking over sunny hills.', difficulty:'Easy',    diffColor:'#86efac', bgGradient:'linear-gradient(145deg,#0a2818,#1a4830)',  emoji:'⛰️',  theme:'mountain', trackColors:{surface:'#4a8838',fill:'#2a5820',dirt:'#60a848'}, buildTrack:buildTrack_GreenRidges },
  { id:'storm_ridge',    name:'Storm Ridge',      description:'Dangerous lightning ridge crosses.',      difficulty:'Hard',    diffColor:'#818cf8', bgGradient:'linear-gradient(145deg,#0c0c28,#1a1a40)',  emoji:'⚡',  theme:'mountain_storm', trackColors:{surface:'#606878',fill:'#404858',dirt:'#808898'}, buildTrack:buildTrack_StormRidge },
  { id:'himalayan_drop', name:'Himalayan Drop',   description:'Massive vertical drops from the clouds.', difficulty:'Insane', diffColor:'#f0abfc', bgGradient:'linear-gradient(145deg,#1a0828,#301050)',  emoji:'🦅',  theme:'mountain_epic', trackColors:{surface:'#b8c0d0',fill:'#8890a8',dirt:'#d0d8e8'}, buildTrack:buildTrack_HimalayanDrop },
  { id:'pinnacle_run',   name:'Pinnacle Run',     description:'The final mountain challenge. Do not fall.',difficulty:'Insane', diffColor:'#e879f9', bgGradient:'linear-gradient(145deg,#1a0828,#301050)',  emoji:'👑',  theme:'mountain_epic', trackColors:{surface:'#b8c0d0',fill:'#8890a8',dirt:'#d0d8e8'}, buildTrack:buildTrack_PinnacleRun },
];

/** --- Track Builder Utility --- */
class Builder {
  constructor(startY = 250) {
    this.p = [];
    this.x = 0;
    this.y = startY;
    this.p.push({x: this.x, y: this.y});
  }

  // Calculates a difficulty multiplier based on distance traveled.
  // Starts at 0.2 (very easy/small) and ramps up to 1.0 (full height) over 12000 pixels.
  getDiffMult() {
    return Math.min(1.0, 0.2 + (this.x / 12000) * 0.8);
  }
  
  flat(dist) {
    const segments = Math.max(10, Math.floor(dist/15));
    const step = dist / segments;
    for(let i=1; i<=segments; i++) {
      this.x += step;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  slope(distX, distY) {
    distY *= this.getDiffMult(); // Scale difficulty
    const segments = Math.max(10, Math.floor(Math.abs(distX)/10));
    const sx = distX / segments;
    const startY = this.y;
    for(let i=1; i<=segments; i++) {
      this.x += sx;
      const t = i / segments;
      // Smooth step interpolation for buttery smooth ramp transitions
      const ease = t * t * (3 - 2 * t);
      this.y = startY + distY * ease;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  hill(width, height) {
    height *= this.getDiffMult(); // Scale difficulty
    const segments = Math.max(20, Math.floor(width/10));
    const sx = width / segments;
    const startY = this.y;
    for(let i=1; i<=segments; i++) {
      this.x += sx;
      const t = i / segments;
      // Perfect smooth sine curve for hills
      this.y = startY - height * Math.sin(t * Math.PI);
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  valley(width, depth) {
    depth *= this.getDiffMult(); // Scale difficulty
    const segments = Math.max(20, Math.floor(width/10));
    const sx = width / segments;
    const startY = this.y;
    for(let i=1; i<=segments; i++) {
      this.x += sx;
      const t = i / segments;
      this.y = startY + depth * Math.sin(t * Math.PI);
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  sine(width, height, cycles = 1) {
    height *= this.getDiffMult(); // Scale difficulty
    const segments = Math.max(20, Math.floor(width/8));
    const sx = width / segments;
    const startY = this.y;
    for(let i=1; i<=segments; i++) {
      this.x += sx;
      this.y = startY - Math.sin((i / segments) * Math.PI * 2 * cycles) * height;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  arcHill(width, height) {
    return this.hill(width, height);
  }

  get() {
    // Post-process: cap maximum slope to prevent impossible walls
    const MAX_SLOPE = 0.45; // max dy/dx ratio (~24 degrees)
    const pts = this.p;
    for (let pass = 0; pass < 3; pass++) { // multiple passes for convergence
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i-1].x;
        if (dx < 0.1) continue;
        const dy = pts[i].y - pts[i-1].y;
        const slope = dy / dx;
        if (Math.abs(slope) > MAX_SLOPE) {
          // Clamp the Y change to max allowed
          pts[i].y = pts[i-1].y + Math.sign(slope) * MAX_SLOPE * dx;
        }
      }
    }
    return pts;
  }
}


// ─── Map 1: Desert Flats (Extreme Length ~15000px)
function buildTrack_DesertFlats() {
  const b = new Builder(250).flat(400);
  for(let i=0; i<10; i++) {
    b.hill(600, 60);
    b.flat(300);
    b.arcHill(800, 80);
    b.flat(250);
    b.sine(800, 35, 2); // gentle bumpy roller
    b.flat(400);
  }
  return b.flat(800).get();
}

// ─── Map 2: Rocky Ridge (Jagged Up/Down ~15000px)
function buildTrack_RockyRidge() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<15; i++) {
    b.slope(300, -100).slope(300, 100); // Widened peaks
    b.slope(250, -60).slope(250, 60);
    b.flat(150);
    b.slope(400, -130).slope(300, 130); // asymmetrical peak
    b.flat(250);
  }
  return b.flat(800).get();
}

// ─── Map 3: Canyon Drop (Huge Valleys ~16000px)
function buildTrack_CanyonDrop() {
  const b = new Builder(200).flat(200);
  for(let i=0; i<12; i++) {
    b.flat(250);
    b.slope(500, 180); // Widened, less steep drop
    b.flat(400);       // wider bottom
    b.slope(600, -180); // Widened climb out
    b.flat(150);
    b.arcHill(600, 80);
  }
  return b.flat(800).get();
}

// ─── Map 4: Insane Peak (Extreme Heights ~16000px)
function buildTrack_InsanePeak() {
  const b = new Builder(250).flat(100);
  for(let i=0; i<10; i++) {
    // Near vertical climb
    b.slope(200, -300, 30);
    b.flat(80);
    b.slope(200, 300, 30);
    b.flat(150);
    b.slope(350, -400, 40); // Mega mountain
    b.slope(350, 400, 40);
    b.flat(200);
  }
  return b.flat(800).get();
}

// ─── Map 5: Angkor Dawn (Giant Steps ~15000px)
function buildTrack_AngkorDawn() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<12; i++) {
    b.slope(100, -80).flat(100); // step up
    b.slope(100, -80).flat(100); // step up
    b.slope(100, -80).flat(300); // top plateau
    b.slope(300, 240); // long slide down
    b.flat(200);
    b.arcHill(500, 120);
    b.flat(150);
  }
  return b.flat(800).get();
}

// ─── Map 6: Jungle Canopy (Bumpy & Muddy ~15000px)
function buildTrack_JungleCanopy() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<15; i++) {
    b.sine(600, 80, 3); // lots of bumps
    b.slope(250, -180).slope(300, 180);
    b.flat(150);
    b.arcHill(400, -80); // inverted arch (valley)
    b.flat(200);
  }
  return b.flat(800).get();
}

// ─── Map 7: City Circuit (Ramps & Platforms ~16000px)
function buildTrack_CityCircuit() {
  const b = new Builder(240).flat(200);
  for(let i=0; i<14; i++) {
    b.slope(400, -150); // ramp up
    b.flat(400); // highway straight
    b.slope(200, 150); // ramp down
    b.flat(200);
    b.slope(500, -200).flat(300).slope(300, 200); // grand bridge
    b.flat(150);
  }
  return b.flat(800).get();
}

// ─── Map 8: Temple Gauntlet (Brutal Stairs ~15000px)
function buildTrack_TempleGauntlet() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<10; i++) {
    // 5 rapid steep steps up
    for(let j=0; j<5; j++) { b.slope(60, -90).flat(40); }
    b.flat(300);
    // 1 massive drop
    b.slope(250, 450);
    b.flat(300);
    b.arcHill(600, 200);
    b.flat(200);
  }
  return b.flat(800).get();
}

// ─── Map 9: Night Rider (Mega Jumps ~16000px)
function buildTrack_NightRider() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<15; i++) {
    b.slope(500, -250); // Long takeoff ramp
    b.slope(300, 250);  // steep landing
    b.flat(300);
    b.hill(600, 200);
    b.flat(250);
  }
  return b.flat(800).get();
}

// ─── Map 10: Jungle Abyss (The Ultimate Test ~18000px)
function buildTrack_JungleAbyss() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<12; i++) {
    b.slope(300, -250).flat(100).slope(200, -200); // climb to sky
    b.flat(200);
    b.slope(400, 600); // TERRIFYING ABYSS DROP
    b.flat(300);
    b.sine(800, 120, 3); // rough terrain
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 11: Volcano Rush (Lava flows, steep drops ~16000px)
function buildTrack_VolcanoRush() {
  const b = new Builder(250).flat(200);
  for (let i = 0; i < 12; i++) {
    b.slope(150, -280, 20);   // steep lava ramp up
    b.flat(80);
    b.slope(250, 350, 20);    // explosive drop into lava pit
    b.flat(150);
    b.arcHill(500, 180);      // lava dome
    b.slope(200, -160).slope(200, 160); // jagged crater ridge
    b.flat(200);
    b.sine(600, 70, 2);       // rough lava field
    b.flat(150);
  }
  return b.flat(800).get();
}

// --- Map 12: Snowfall Summit (Ice slopes, powder hills ~15000px)
function buildTrack_SnowfallSummit() {
  const b = new Builder(230).flat(300);
  for (let i = 0; i < 12; i++) {
    b.arcHill(700, 160);      // smooth powder hill
    b.flat(200);
    b.slope(300, -220, 25);   // long icy climb
    b.flat(100);
    b.slope(400, 300, 25);    // fast icy slide down
    b.flat(200);
    b.sine(500, 50, 3);       // moguls
    b.flat(150);
    b.hill(400, 120);
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 13: Coral Beach (Waves + gap jumps ~14000px)
function buildTrack_CoralBeach() {
  const b = new Builder(260).flat(300);
  for (let i = 0; i < 10; i++) {
    b.sine(800, 45, 3);       // gentle beach waves
    b.flat(200);
    b.slope(350, -220);       // big jump ramp
    b.slope(250, 220);        // landing
    b.flat(300);
    b.arcHill(500, 100);      // coral mound
    b.flat(100);
    b.valley(400, 130);       // tidal pool dip
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 14: Crystal Cave (Underground tight drops ~15000px)
function buildTrack_CrystalCave() {
  const b = new Builder(240).flat(150);
  for (let i = 0; i < 14; i++) {
    b.slope(80, -120, 8);     // sharp stalactite drop-in
    b.flat(60);
    b.slope(120, 200, 10);    // deep pit
    b.flat(80);
    b.slope(200, -180, 15);   // crystal wall climb
    b.flat(120);
    b.sine(400, 90, 2);       // bumpy crystal floor
    b.flat(100);
    b.slope(150, -250, 12);   // sudden spike up
    b.slope(100, 250, 12);    // back down
    b.flat(100);
  }
  return b.flat(800).get();
}

// --- Map 15: Asteroid Belt (Massive leaps, irregular rocks ~17000px)
function buildTrack_AsteroidBelt() {
  const b = new Builder(250).flat(200);
  for (let i = 0; i < 12; i++) {
    b.slope(600, -300);       // long asteroid ramp
    b.slope(300, 300);        // drop to next rock
    b.flat(300);
    b.slope(150, -350, 15);   // vertical rock spike
    b.slope(150, 350, 15);
    b.flat(150);
    b.sine(700, 100, 2);      // cratered surface
    b.flat(200);
    b.arcHill(800, 250);      // massive asteroid dome
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 16: Toxic Swamp (Acid pits, log bridges, bubbling terrain ~15000px)
function buildTrack_ToxicSwamp() {
  const b = new Builder(260).flat(200);
  for (let i = 0; i < 12; i++) {
    b.sine(500, 55, 3);        // bubbling swamp surface
    b.flat(200);
    b.slope(200, -160);        // log bridge ramp up
    b.flat(300);               // bridge span
    b.slope(200, 160);         // back down into swamp
    b.flat(150);
    b.valley(400, 180);        // acid pool dip
    b.flat(200);
    b.arcHill(450, 130);       // mossy mound
    b.slope(150, -90).slope(150, 90); // bumpy root
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 17: Steel Factory (Gear ramps, conveyor belts, molten drops ~16000px)
function buildTrack_SteelFactory() {
  const b = new Builder(240).flat(200);
  for (let i = 0; i < 13; i++) {
    b.slope(300, -180, 8);     // steep metal ramp (sharp)
    b.flat(350);               // conveyor belt flat
    b.slope(200, 180, 8);      // sharp drop off edge
    b.flat(150);
    b.slope(400, -250).flat(200).slope(250, 250); // bridge over molten pit
    b.flat(150);
    b.sine(400, 60, 2);        // shaking machinery floor
    b.slope(100, -120).slope(100, 120); // pipe bump
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 18: Arctic Tundra (Long icy flats, snowdrift ramps ~14000px)
function buildTrack_ArcticTundra() {
  const b = new Builder(240).flat(400);
  for (let i = 0; i < 11; i++) {
    b.slope(500, -120, 30);    // gentle icy climb (slippery)
    b.flat(300);
    b.slope(600, 180, 30);     // long icy descent
    b.flat(300);
    b.arcHill(600, 100);       // snowdrift mound
    b.flat(200);
    b.valley(500, 100);        // frozen riverbed
    b.flat(300);
    b.sine(400, 40, 2);        // ice ripples
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 19: Lava Tubes (Tight underground cave with lava rivers ~16000px)
function buildTrack_LavaTubes() {
  const b = new Builder(240).flat(150);
  for (let i = 0; i < 14; i++) {
    b.slope(100, -200, 10);    // sharp lava tube drop-in
    b.flat(100);
    b.slope(200, 300, 12);     // plunge into lava trench
    b.flat(120);
    b.slope(250, -280, 15);    // wall climb out
    b.flat(100);
    b.sine(500, 100, 2);       // bubbling lava floor
    b.slope(150, -180, 10);
    b.slope(100, 180, 10);
    b.flat(150);
  }
  return b.flat(800).get();
}

// --- Map 20: Sky Islands (Floating platforms in the clouds ~17000px)
function buildTrack_SkyIslands() {
  const b = new Builder(200).flat(200);
  for (let i = 0; i < 13; i++) {
    b.slope(500, -350);        // massive ramp launch to next island
    b.slope(200, 350);         // land hard
    b.flat(400);               // floating island top
    b.slope(150, -280, 12);    // edge spike
    b.slope(150, 280, 12);
    b.flat(200);
    b.arcHill(700, 300);       // sky arch dome
    b.flat(300);
  }
  return b.flat(800).get();
}

// --- Map 21: Alpine Pass (Rolling green mountain hills ~15000px)
function buildTrack_AlpinePass() {
  const b = new Builder(250).flat(400);
  for (let i = 0; i < 10; i++) {
    b.arcHill(800, 180);         // big smooth mountain
    b.flat(200);
    b.hill(600, 120);            // medium hill
    b.valley(400, 80);           // valley between mountains
    b.flat(150);
    b.arcHill(1000, 220);        // wide mountain pass
    b.flat(200);
    b.sine(600, 50, 2);          // rolling foothills
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 22: Thunder Peak (Steep dramatic peaks ~16000px)
function buildTrack_ThunderPeak() {
  const b = new Builder(250).flat(200);
  for (let i = 0; i < 12; i++) {
    b.slope(300, -280);          // steep mountain climb
    b.flat(100);
    b.slope(250, 280);           // steep descent
    b.flat(200);
    b.slope(200, -200).slope(200, -100); // double peak ascent
    b.flat(80);
    b.slope(400, 300);           // long slide down
    b.flat(150);
    b.hill(500, 160);            // rocky outcrop
    b.slope(150, -180).slope(150, 180); // jagged spike
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 23: Everest Climb (Epic long ascent & descent ~18000px)
function buildTrack_EverestClimb() {
  const b = new Builder(250).flat(300);
  for (let i = 0; i < 8; i++) {
    // Long climb up the mountain
    b.slope(600, -250);          // gradual ascent
    b.flat(150);
    b.slope(400, -200);          // steeper climb
    b.flat(100);
    b.slope(300, -180);          // near summit push
    b.flat(300);                 // summit plateau
    // Epic descent
    b.slope(500, 350);           // big drop
    b.flat(200);
    b.slope(300, 200);           // continued fall
    b.valley(600, 150);          // valley floor
    b.flat(200);
    b.arcHill(700, 200);         // mountain ridge
    b.sine(500, 80, 2);          // rocky terrain
    b.flat(200);
  }
  return b.flat(800).get();
}

// --- Map 24: Highland Sprint
function buildTrack_HighlandSprint() {
  const b = new Builder(250).flat(300);
  for (let i = 0; i < 15; i++) {
    b.flat(200).arcHill(800, 100).flat(200).slope(300, 150).flat(100).slope(200, -100).flat(200);
  }
  return b.flat(800).get();
}

// --- Map 25: Crag Valley
function buildTrack_CragValley() {
  const b = new Builder(250).flat(200);
  for (let i = 0; i < 12; i++) {
    b.hill(400, 180).valley(300, 150).slope(150, -200).flat(100).slope(150, 200).flat(100).sine(600, 80, 3);
  }
  return b.flat(800).get();
}

// --- Map 26: Summit Rush
function buildTrack_SummitRush() {
  const b = new Builder(250).flat(300);
  for (let i = 0; i < 10; i++) {
    b.slope(500, -350).flat(50).slope(300, -250).flat(100).slope(400, 400).valley(500, 100).flat(200);
  }
  return b.flat(800).get();
}

// --- Map 27: Green Ridges
function buildTrack_GreenRidges() {
  const b = new Builder(250).flat(400);
  for (let i = 0; i < 12; i++) {
    b.arcHill(600, 80).flat(300).arcHill(700, 120).flat(400).sine(800, 40, 2).flat(300);
  }
  return b.flat(800).get();
}

// --- Map 28: Storm Ridge
function buildTrack_StormRidge() {
  const b = new Builder(250).flat(200);
  for (let i = 0; i < 14; i++) {
    b.slope(300, -180).flat(200).slope(250, 250).flat(150).hill(300, 200).flat(100).gap(150).flat(200).slope(400, -250).flat(200);
  }
  return b.flat(800).get();
}

// --- Map 29: Himalayan Drop
function buildTrack_HimalayanDrop() {
  const b = new Builder(250).flat(400);
  for (let i = 0; i < 10; i++) {
    b.slope(400, -300).flat(100).slope(300, -200).flat(200).slope(800, 700).flat(300).arcHill(600, 150).flat(200);
  }
  return b.flat(800).get();
}

// --- Map 30: Pinnacle Run
function buildTrack_PinnacleRun() {
  const b = new Builder(250).flat(300);
  for (let i = 0; i < 12; i++) {
    b.slope(250, -250).flat(50).gap(120).flat(100).slope(200, -200).flat(50).slope(300, 400).flat(100).gap(150).flat(150).hill(400, 250).flat(200);
  }
  return b.flat(800).get();
}
