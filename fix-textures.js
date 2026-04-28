const fs = require('fs');
let code = fs.readFileSync('d:\\GAME2\\game.js', 'utf8');

code = code.replace(
  /function drawGroundTexture\(theme, tc, vis, cam, g\) \{\n  if \(vis\.length < 2\) return;\n/,
  `function drawGroundTexture(theme, tc, vis, cam, g) {\n  if (vis.length < 2) return;\n  const si = g ? g.track.indexOf(vis[0]) : 0;\n  const s = (off, st) => { let r = (off - si) % st; return r < 0 ? r + st : r; };\n`
);

code = code.replace(/for\s*\(\s*let\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*vis\.length\s*(-\s*\d+)?\s*;\s*i\s*\+=\s*(\d+)\s*\)/g, (match, X, Y, Z) => {
  return `for (let i = s(${X}, ${Z}); i < vis.length${Y || ''}; i+=${Z})`;
});

fs.writeFileSync('d:\\GAME2\\game.js', code);
console.log('Fixed texture loops!');
