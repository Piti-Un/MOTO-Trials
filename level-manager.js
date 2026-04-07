/**
 * Moto Trials — Level Manager
 * Handles save/load of player progress via localStorage.
 * Stars are awarded based on % of coins collected (1 ★ = finish, 2 ★★ = 40%, 3 ★★★ = 80%)
 */

const LevelManager = {
  STORAGE_KEY: 'motoTrials_v1',
  _data: null,

  // ── Init ──────────────────────────────────────────────────
  init() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._data = raw ? JSON.parse(raw) : null;
    } catch (_) { this._data = null; }
    if (!this._data) this._data = this._defaults();
    // ensure any new levels are present
    LEVELS.forEach((lvl, i) => {
      if (!this._data[lvl.id]) this._data[lvl.id] = { unlocked: i === 0, stars: 0 };
    });
    return this;
  },

  _defaults() {
    const d = {};
    LEVELS.forEach((lvl, i) => { d[lvl.id] = { unlocked: i === 0, stars: 0 }; });
    return d;
  },

  _save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
  },

  // ── Queries ───────────────────────────────────────────────
  isUnlocked(id)   { return !!this._data[id]?.unlocked; },
  getStars(id)     { return this._data[id]?.stars ?? 0; },
  getTotalStars()  {
    return LEVELS.reduce((sum, lvl) => sum + this.getStars(lvl.id), 0);
  },

  getEquippedSkin() { return this._data.equippedSkin || 'classic'; },
  setEquippedSkin(skinId) { 
    this._data.equippedSkin = skinId; 
    this._save(); 
  },

  // ── Record completion ─────────────────────────────────────
  // flagsGot = 1-3 (number of checkpoint flags reached)
  complete(id, flagsGot, _total) {
    const stars = Math.max(1, Math.min(3, flagsGot)); // already 1-3

    const entry = this._data[id] || { unlocked: true, stars: 0 };
    entry.stars = Math.max(entry.stars, stars);
    this._data[id] = entry;

    // Unlock the next level
    const idx = LEVELS.findIndex(l => l.id === id);
    if (idx >= 0 && idx < LEVELS.length - 1) {
      const nextId = LEVELS[idx + 1].id;
      this._data[nextId] = this._data[nextId] || { unlocked: false, stars: 0 };
      this._data[nextId].unlocked = true;
    }

    this._save();
    return stars;
  },

  // ── Reset (debug / settings) ──────────────────────────────
  resetAll() {
    this._data = this._defaults();
    this._save();
  },
};
