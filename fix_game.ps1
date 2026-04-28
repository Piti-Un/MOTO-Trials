# Read the file as raw bytes and decode as Latin-1 to preserve byte values
$file = "d:\GAME2\game.js"
$bytes = [System.IO.File]::ReadAllBytes($file)
$latin1 = [System.Text.Encoding]::GetEncoding('iso-8859-1')
$text = $latin1.GetString($bytes)

# These corrupted sequences are: UTF-8 bytes of emoji re-interpreted as Latin-1
# Each emoji was already UTF-8 encoded, then the file was re-saved treating those bytes as Latin-1
# and re-encoded as UTF-8 again (double encoding).

# Fix: 0xF0 0x9F 0x94 0x87 = U+1F507 SPEAKER WITH CANCELLATION STROKE (muted)
$muted   = $latin1.GetString([byte[]]@(0xF0,0x9F,0x94,0x87))
# Fix: 0xF0 0x9F 0x94 0x8A = U+1F50A SPEAKER WITH THREE SOUND WAVES (loud)
$speaker = $latin1.GetString([byte[]]@(0xF0,0x9F,0x94,0x8A))
# Fix: 0xF0 0x9F 0x94 0xA5 = U+1F525 FIRE
$fire    = $latin1.GetString([byte[]]@(0xF0,0x9F,0x94,0xA5))
# Fix: 0xF0 0x9F 0x90 0x8C = U+1F40C SNAIL
$snail   = $latin1.GetString([byte[]]@(0xF0,0x9F,0x90,0x8C))
# Fix: 0xE2 0x8B 0x86 = U+22C6 STAR OPERATOR or checkmark, but actual intent is checkered star
# Actually the star label uses: 0xE2 0x8B 0x86 which is â‹† (star operator)
# Let's use: U+2B50 (star emoji) = 0xE2 0xAD 0x90
$starCheck = $latin1.GetString([byte[]]@(0xE2,0x8B,0x86))
# Fix: 0xE2 0x8F 0xB1 = U+23F1 STOPWATCH
$stopwatch = $latin1.GetString([byte[]]@(0xE2,0x8F,0xB1))
# Fix: 0xF0 0x9F 0x8F 0x86 = U+1F3C6 TROPHY
$trophy  = $latin1.GetString([byte[]]@(0xF0,0x9F,0x8F,0x86))
# Fix: 0xF0 0x9F 0x8F 0x81 = U+1F3C1 CHEQUERED FLAG
$flag    = $latin1.GetString([byte[]]@(0xF0,0x9F,0x8F,0x81))
# Fix: 0xC2 0xB7 = U+00B7 MIDDLE DOT
$middot  = $latin1.GetString([byte[]]@(0xC2,0xB7))
# Fix: 0xF0 0x9F 0x9A 0x9E = U+1F69E (flip acrobat?)
# Actually flip uses trophy icon U+1F3C6 = 0xF0 0x9F 0x8F 0x86

Write-Host "Muted bytes: $($muted | ForEach-Object { [int][char]$_ })"
Write-Host "Speaker bytes: $($speaker | ForEach-Object { [int][char]$_ })"

# Now replace in text:
# Line 137: soundMuted ? '<muted>' : '<speaker>'
$oldMutedLine = "soundMuted ? '$muted' : '$speaker'"
$newMutedLine  = "soundMuted ? [String]::new([char]0xD83D,[char]0xDD07) : [String]::new([char]0xD83D,[char]0xDD0A)"
# Actually let's just use a simpler approach: replace the bad sequences with ASCII-safe JS unicode escapes

# Replace muted icon in toggleSound
$text = $text.Replace("soundMuted ? '$muted' : '$speaker'", "soundMuted ? String.fromCodePoint(0x1F507) : String.fromCodePoint(0x1F50A)")

# Replace fire icon in throttleBar
$text = $text.Replace("throttlePct >= 80 ? '$fire'", "throttlePct >= 80 ? String.fromCodePoint(0x1F525)")

# Replace snail icon in throttleBar  
$text = $text.Replace(": '$snail'", ": String.fromCodePoint(0x1F40C)")

# Replace star symbol in starLabel (the corrupted star operator)
# The corrupted sequence before ' + g.stars + '/3'
# Let's find what's in starLabel line
$starLabelPattern = "textContent  = '$starCheck " 
$text = $text.Replace("= '$starCheck ' + g.stars", "= String.fromCodePoint(0x2B50) + ' ' + g.stars")

# Replace stopwatch in timerLabel
$text = $text.Replace("= '$stopwatch ' + tMin", "= String.fromCodePoint(0x23F1) + ' ' + tMin")

# Replace trophy in flip counter
$text = $text.Replace("= '$trophy ' + b.flipsTotal", "= String.fromCodePoint(0x1F3C6) + ' ' + b.flipsTotal")

# Replace fire/trophy in combo meter
$text = $text.Replace(">= 3 ? '$fire Perfect Run!'", ">= 3 ? String.fromCodePoint(0x1F525) + ' Perfect Run!'")
$text = $text.Replace("? ('$trophy x'", "? (String.fromCodePoint(0x1F3C6) + ' x'")

# Replace chequered flag in endGame
$text = $text.Replace("won ? '$flag'", "won ? String.fromCodePoint(0x1F3C1)")

# Replace middle dot separator in subText
$text = $text.Replace("}m $middot{", "}m \u00B7 {")

# Write back as UTF-8
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $text, $utf8NoBom)
Write-Host "Done! File fixed."
