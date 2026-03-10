$file = "src/app/whatsapp/page.js"
$lines = Get-Content $file
Write-Host "Total lines before: $($lines.Count)"
# Keep lines 1-1161 (index 0-1160) and lines 1372+ (index 1371+)
$keep = $lines[0..1160] + $lines[1371..($lines.Count-1)]
Write-Host "Total lines after: $($keep.Count)"
$keep | Set-Content $file -Encoding UTF8
Write-Host "Done! Removed lines 1162-1371"
