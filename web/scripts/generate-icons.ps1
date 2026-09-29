Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\LENOVO\.gemini\antigravity-ide\brain\fcf0151e-db8d-4abe-ba2e-b88d46404658\.user_uploaded\media_1790654521055.jpg"
$destDir = "d:\WEB PROJEK\NEXTJS\e-presensi-v2\web\public\icons"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

function Resize-And-Save($targetWidth, $targetHeight, $outFileName) {
    $outPath = Join-Path $destDir $outFileName
    $destBitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graphics.DrawImage($srcImage, 0, 0, $targetWidth, $targetHeight)
    $destBitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $destBitmap.Dispose()
    Write-Host "Created: $outPath ($targetWidth x $targetHeight)"
}

Resize-And-Save 192 192 "icon-192x192.png"
Resize-And-Save 512 512 "icon-512x512.png"
Resize-And-Save 180 180 "apple-touch-icon.png"
Resize-And-Save 512 512 "app-logo.png"
Resize-And-Save 32 32 "favicon-32x32.png"

$srcImage.Dispose()
Write-Host "All icons generated successfully!"
