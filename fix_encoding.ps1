$file = "d:\GAME2\game.js"
$bytes = [System.IO.File]::ReadAllBytes($file)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Fix toggleSound: the corrupted bytes represent mute icon and speaker icon
# The corrupted sequences represent: 0x1F507 (muted speaker) and 0x1F50A (loud speaker)
# Replace each corrupted string with Unicode escape in JS

# Line 137: btn.textContent = soundMuted ? '<corrupted mute>' : '<corrupted speaker>'
# Replace with proper emoji strings
$text = $text -replace "soundMuted \? '[^']+' : '[^']+'", "soundMuted ? '\u{1F507}' : '\u{1F50A}'"

# Fix starLabel: corrupted star symbol (should be checkered/star)
# Line 645: starLabel  = '<corrupted> ' + g.stars + '/3'
$text = $text -replace "\.textContent  = '[^\x00-\x7F]+' \+ g\.stars \+ '/3'", ".textContent  = '\u2605 ' + g.stars + '/3'"

# Fix timerLabel: corrupted timer symbol
# Line 653: timerEl.textContent = '<corrupted> ' + tMin
$text = $text -replace "timerEl\.textContent = '[^\x00-\x7F]+' \+ tMin", "timerEl.textContent = '\u23F1 ' + tMin"

# Fix throttleBar: corrupted emoji for fire and snail  
# Line 643: throttlePct >= 80 ? '<fire>' : ... : '<snail>'
$text = $text -replace "throttlePct >= 80 \? '[^']+' : throttlePct >= 50 \? '⚡' : throttlePct >= 20 \? '💨' : '[^']+'", "throttlePct >= 80 ? '\u{1F525}' : throttlePct >= 50 ? '⚡' : throttlePct >= 20 ? '💨' : '\u{1F40C}'"

# Fix flip counter text
$text = $text -replace "comboEl\.textContent = '[^\x00-\x7F]+' \+ b\.flipsTotal \+ \(b\.flipsTotal > 1 \? ' Flips!' : ' Flip!'\)", "comboEl.textContent = '\u{1F3C6} ' + b.flipsTotal + (b.flipsTotal > 1 ? ' Flips!' : ' Flip!')"

# Fix combo text
$text = $text -replace "comboEl\.textContent = g\.comboStreak >= 3 \? '[^']+' : \('([^']+)' \+ g\.comboStreak \+ ' Combo!'\)", "comboEl.textContent = g.comboStreak >= 3 ? '\u{1F525} Perfect Run!' : ('\u{1F3C6} x' + g.comboStreak + ' Combo!')"

# Fix endGame emoji in overlay  
# Line 353: emoji = won ? '<corrupted>' : '💥'
$text = $text -replace "won \? '[^\x00-\x7F][^']+' : '💥'", "won ? '\u{1F3C1}' : '💥'"

# Fix subText dot separator
$text = $text -replace "g\.dist\}m [^\x00-\x7F]\{1,4\} \$\{earnedStars\}/3 flags", "g.dist}m \u00B7 \${earnedStars}/3 flags"

[System.IO.File]::WriteAllText($file, $text, [System.Text.Encoding]::UTF8)
Write-Host "Done fixing encoding issues"
