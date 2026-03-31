$f = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\src\app\projecten\[id]\page.js'
$lines = [System.IO.File]::ReadAllLines($f, [System.Text.Encoding]::UTF8)

# The lines we are replacing are index 6537 to 6549 (lines 6538 to 6550)
$newBlock = @"
                                                            <div style={{ padding: '9px 12px', background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', gap: 7 }}>
                                                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <i className="fa-solid fa-list-check" style={{ color: '#fff', fontSize: '0.7rem' }} />
                                                                </div>
                                                                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', flexShrink: 0, letterSpacing: '0.01em' }}>Voorgestelde taken</span>
                                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 6, padding: '3px 8px', marginLeft: 4 }}>
                                                                    <i className="fa-solid fa-magnifying-glass" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.55rem', flexShrink: 0 }} />
                                                                    <input value={paletZoek} onChange={e => setPaletZoek(e.target.value)} placeholder="Zoek..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '0.68rem', fontWeight: 500, minWidth: 0 }} />
                                                                    {paletZoek && <button onClick={() => setPaletZoek('')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, fontSize: '0.58rem', lineHeight: 1, flexShrink: 0 }}>&times;</button>}
                                                                </div>
                                                            </div>
"@

$newLinesArr = $newBlock -split "`r`n"

$outLines = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt 6537; $i++) {
    $outLines.Add($lines[$i])
}
foreach ($nl in $newLinesArr) {
    if (-not [string]::IsNullOrEmpty($nl)) {
        $outLines.Add($nl)
    }
}
for ($i = 6550; $i -lt $lines.Length; $i++) {
    $outLines.Add($lines[$i])
}

[System.IO.File]::WriteAllLines($f, $outLines, [System.Text.Encoding]::UTF8)
Write-Host "OK - inline search box created"
