$file = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\src\app\materieel\page.js'
$c = [System.IO.File]::ReadAllText($file)

# Opschalen van klein naar groot (in volgorde van klein naar groot)
$c = $c.Replace("fontSize: '0.6rem'", "fontSize: '0.72rem'")
$c = $c.Replace("fontSize: '0.65rem'", "fontSize: '0.75rem'")
$c = $c.Replace("fontSize: '0.68rem'", "fontSize: '0.78rem'")
$c = $c.Replace("fontSize: '0.7rem'", "fontSize: '0.8rem'")
$c = $c.Replace("fontSize: '0.72rem'", "fontSize: '0.82rem'")
$c = $c.Replace("fontSize: '0.75rem'", "fontSize: '0.85rem'")
$c = $c.Replace("fontSize: '0.8rem'", "fontSize: '0.88rem'")
$c = $c.Replace("fontSize: '0.82rem'", "fontSize: '0.9rem'")
$c = $c.Replace("fontSize: '0.85rem'", "fontSize: '0.92rem'")
$c = $c.Replace("fontSize: '0.88rem'", "fontSize: '0.95rem'")
$c = $c.Replace("fontSize: '0.92rem'", "fontSize: '1rem'")
$c = $c.Replace("fontSize: '0.95rem'", "fontSize: '1.02rem'")

[System.IO.File]::WriteAllText($file, $c)
Write-Host "Done - alle fonts opgeschaald!"
