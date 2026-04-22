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
];

/** --- Track Builder Utility --- */
class Builder {
  constructor(startY = 250) {
    this.p = [];
    this.x = 0;
    this.y = startY;
    this.p.push({x: this.x, y: this.y});
  }
  
  flat(dist, segments = 10) {
    const step = dist / segments;
    for(let i=0; i<segments; i++) {
      this.x += step;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  slope(distX, distY, segments = 10) {
    const sx = distX / segments;
    const sy = distY / segments;
    for(let i=0; i<segments; i++) {
      this.x += sx;
      this.y += sy;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  hill(width, height, segments = 20) {
    this.slope(width/2, -height, segments/2); // up
    this.slope(width/2, height, segments/2);  // down
    return this;
  }

  valley(width, depth, segments = 20) {
    this.slope(width/2, depth, segments/2);   // down
    this.slope(width/2, -depth, segments/2);  // up
    return this;
  }

  sine(width, height, cycles = 1, segments = 20) {
    const sx = width / segments;
    const startY = this.y;
    for(let i=1; i<=segments; i++) {
      this.x += sx;
      this.y = startY - Math.sin((i / segments) * Math.PI * 2 * cycles) * height;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  arcHill(width, height, segments = 20) {
    const sx = width / segments;
    const startY = this.y;
    for(let i=1; i<=segments; i++) {
      this.x += sx;
      this.y = startY - Math.sin((i / segments) * Math.PI) * height;
      this.p.push({x: this.x, y: this.y});
    }
    return this;
  }

  get() { return this.p; }
}


// ─── Map 1: Desert Flats (Extreme Length ~15000px)
function buildTrack_DesertFlats() {
  const b = new Builder(250).flat(300);
  for(let i=0; i<10; i++) {
    b.hill(400, 100);
    b.flat(200);
    b.arcHill(600, 150);
    b.flat(150);
    b.sine(800, 60, 2); // bumpy roller
    b.flat(300);
  }
  return b.flat(800).get();
}

// ─── Map 2: Rocky Ridge (Jagged Up/Down ~15000px)
function buildTrack_RockyRidge() {
  const b = new Builder(250).flat(200);
  for(let i=0; i<15; i++) {
    b.slope(200, -150).slope(200, 150); // Sharp peak
    b.slope(150, -80).slope(150, 80);   // smaller peak
    b.flat(100);
    b.slope(300, -200).slope(200, 200); // asymmetrical peak
    b.flat(200);
  }
  return b.flat(800).get();
}

// ─── Map 3: Canyon Drop (Huge Valleys ~16000px)
function buildTrack_CanyonDrop() {
  const b = new Builder(200).flat(200);
  for(let i=0; i<12; i++) {
    b.flat(200);
    b.slope(400, 250); // Steep drop
    b.flat(300);       // bottom
    b.slope(500, -250); // Steep climb out
    b.flat(100);
    b.arcHill(500, 100);
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
