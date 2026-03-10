Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\public\ds-logo.png'
$outPath = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\public\ds-logo-fixed.png'

$src = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.Clear([System.Drawing.Color]::White)
$graphics.DrawImage($src, 0, 0, $src.Width, $src.Height)
$graphics.Dispose()
$src.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# Replace original
Remove-Item $srcPath
Rename-Item $outPath 'ds-logo.png'

Write-Host "Logo opgeslagen met witte achtergrond!"
