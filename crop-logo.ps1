Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\public\ds-logo-sidebar.png'
$outPath = 'C:\Users\desch\.gemini\antigravity\scratch\backend-app\public\ds-logo-sidebar2.png'

$src = New-Object System.Drawing.Bitmap($srcPath)
$w = $src.Width
$h = $src.Height
Write-Host "Size: $w x $h"

# Make white/near-white pixels transparent
for ($x = 0; $x -lt $w; $x++) {
    for ($y = 0; $y -lt $h; $y++) {
        $pixel = $src.GetPixel($x, $y)
        # If pixel is white or near-white (outside the circle area)
        if ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240) {
            $src.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}

$src.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$src.Dispose()
Write-Host "Saved transparent version to $outPath"
