$f = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\src\app\projecten\[id]\page.js'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# we target the exact broken line by regex because it contains the formfeed
$c = $c -replace '<i className=\{.a-solid \} /> Vernieuwen', '<i className={`fa-solid ${kanaalBerichtenLaden ? ''fa-spinner fa-spin'' : ''fa-rotate-right''}`} /> Vernieuwen'

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Fix voltooid"
