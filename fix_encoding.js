const fs = require('fs');

const file = 'd:\\GAME2\\game.js';

// Read the file as a Buffer (raw bytes)
const buf = fs.readFileSync(file);

// The file was saved as UTF-8, but our viewer is showing it with double-encoding.
// The actual bytes on disk are valid UTF-8, so we read them as UTF-8:
let text = buf.toString('utf8');

// Now fix the problematic lines by replacing corrupted unicode sequences
// with clean ASCII-safe JS unicode escape strings.

// 1. Fix toggleSound: replace the emoji icons for muted/speaker
// The button in HTML already shows 🔊, we just need the toggle to work.
// Replace the corrupt string assignment with String.fromCodePoint calls
text = text.replace(
  /if \(btn\) btn\.textContent = soundMuted \? '[^']+' : '[^']+';/,
  "if (soundMuted) {\n    if (sfx.ctx) sfx.ctx.suspend();\n    if (btn) btn.textContent = String.fromCodePoint(0x1F507);\n  } else {\n    if (sfx.ctx) sfx.ctx.resume();\n    if (btn) btn.textContent = String.fromCodePoint(0x1F50A);\n  }"
);

// 2. Fix throttleBar line: replace the corrupt emoji at >= 80 and the snail at end
text = text.replace(
  /const throttleBar = throttlePct >= 80 \? '[^']+' : throttlePct >= 50 \? '[^']+' : throttlePct >= 20 \? '[^']+' : '[^']+';/,
  "const throttleBar = throttlePct >= 80 ? String.fromCodePoint(0x1F525) : throttlePct >= 50 ? '\\u26A1' : throttlePct >= 20 ? String.fromCodePoint(0x1F4A8) : String.fromCodePoint(0x1F40C);"
);

// 3. Fix starLabel: replace corrupt star symbol
text = text.replace(
  /document\.getElementById\('starLabel'\)\.textContent\s*=\s*'[^']+'\s*\+\s*g\.stars\s*\+\s*'\/3';/,
  "document.getElementById('starLabel').textContent  = String.fromCodePoint(0x2B50) + ' ' + g.stars + '/3';"
);

// 4. Fix timerLabel: replace corrupt stopwatch symbol
text = text.replace(
  /if \(timerEl\) timerEl\.textContent = '[^']+'\s*\+\s*tMin/,
  "if (timerEl) timerEl.textContent = String.fromCodePoint(0x23F1) + ' ' + tMin"
);

// 5. Fix flip counter comboEl text
text = text.replace(
  /comboEl\.textContent = '[^']+'\s*\+\s*b\.flipsTotal\s*\+\s*\(b\.flipsTotal > 1 \? ' Flips!' : ' Flip!'\);/,
  "comboEl.textContent = String.fromCodePoint(0x1F3C6) + ' ' + b.flipsTotal + (b.flipsTotal > 1 ? ' Flips!' : ' Flip!');"
);

// 6. Fix combo streak text 
text = text.replace(
  /comboEl\.textContent = g\.comboStreak >= 3 \? '[^']+' : \('[^']+' \+ g\.comboStreak \+ ' Combo!'\);/,
  "comboEl.textContent = g.comboStreak >= 3 ? String.fromCodePoint(0x1F525) + ' Perfect Run!' : (String.fromCodePoint(0x1F3C6) + ' x' + g.comboStreak + ' Combo!');"
);

// 7. Fix endGame emoji (won flag / explosion)
text = text.replace(
  /const emoji\s*=\s*won \? '[^']+' : '[^']+';/,
  "const emoji   = won ? String.fromCodePoint(0x1F3C1) : String.fromCodePoint(0x1F4A5);"
);

// 8. Fix middle dot in subText
text = text.replace(
  /\$\{game\.dist\}m [^\x00-\x7F]{1,6} \$\{earnedStars\}\/3 flags/,
  '${game.dist}m \\u00B7 ${earnedStars}/3 flags'
);

// Write back as UTF-8
fs.writeFileSync(file, text, 'utf8');
console.log('Done! game.js fixed successfully.');

// Verify the toggleSound fix
const verify = fs.readFileSync(file, 'utf8');
const idx = verify.indexOf('toggleSound');
console.log('toggleSound context:', verify.substring(idx, idx + 200));
