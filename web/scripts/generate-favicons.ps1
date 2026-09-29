Add-Type -AssemblyName System.Drawing

$srcPath = "d:\WEB PROJEK\NEXTJS\e-presensi-v2\web\public\icons\logo-app-icon.jpg"
$destIcons = "d:\WEB PROJEK\NEXTJS\e-presensi-v2\web\public\icons"
$destPublic = "d:\WEB PROJEK\NEXTJS\e-presensi-v2\web\public"
$destApp = "d:\WEB PROJEK\NEXTJS\e-presensi-v2\web\src\app"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width
$h = $bmp.Height

# Find bounding box of non-white content (threshold brightness < 245)
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0

for ($y = 0; $y -lt $h; $y += 4) {
    for ($x = 0; $x -lt $w; $x += 4) {
        $p = $bmp.GetPixel($x, $y)
        # If not close to pure white
        if ($p.R -lt 245 -or $p.G -lt 245 -or $p.B -lt 245) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Host "Detected Icon Bounds: X: $minX to $maxX, Y: $minY to $maxY"

# Give a 4px breathing room
$pad = 6
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, ($maxY - $minY) + ($pad * 2))

# Make it a square
$side = [Math]::Max($cropW, $cropH)
$centerX = $cropX + ($cropW / 2)
$centerY = $cropY + ($cropH / 2)
$finalX = [Math]::Max(0, [int]($centerX - ($side / 2)))
$finalY = [Math]::Max(0, [int]($centerY - ($side / 2)))

if ($finalX + $side -gt $w) { $side = $w - $finalX }
if ($finalY + $side -gt $h) { $side = $h - $finalY }

$cropRect = New-Object System.Drawing.Rectangle $finalX, $finalY, $side, $side
$croppedBmp = $bmp.Clone($cropRect, $bmp.PixelFormat)

function Save-Resized-Png($bitmap, $targetW, $targetH, $outPath) {
    $targetBmp = New-Object System.Drawing.Bitmap $targetW, $targetH
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($bitmap, 0, 0, $targetW, $targetH)
    $targetBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $targetBmp.Dispose()
    Write-Host "Generated: $outPath ($targetW x $targetH)"
}

# Generate PNG Favicons & App Icons
Save-Resized-Png $croppedBmp 16 16 "$destIcons\favicon-16x16.png"
Save-Resized-Png $croppedBmp 32 32 "$destIcons\favicon-32x32.png"
Save-Resized-Png $croppedBmp 48 48 "$destIcons\favicon-48x48.png"
Save-Resized-Png $croppedBmp 180 180 "$destIcons\apple-touch-icon.png"
Save-Resized-Png $croppedBmp 192 192 "$destIcons\icon-192x192.png"
Save-Resized-Png $croppedBmp 512 512 "$destIcons\icon-512x512.png"

# Copy essential icons to public/ root
Save-Resized-Png $croppedBmp 32 32 "$destPublic\favicon.png"
Save-Resized-Png $croppedBmp 180 180 "$destPublic\apple-touch-icon.png"
Save-Resized-Png $croppedBmp 512 512 "$destPublic\icon.png"

# Create a genuine multi-resolution .ICO file (16, 32, 48)
$icoSizes = @(16, 32, 48)
$icoBitmaps = @()
foreach ($sz in $icoSizes) {
    $tempBmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($tempBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($croppedBmp, 0, 0, $sz, $sz)
    $g.Dispose()
    $icoBitmaps += $tempBmp
}

# Write standard ICO format to file
function Write-IcoFile($bitmaps, $filePath) {
    $fs = [System.IO.File]::OpenWrite($filePath)
    $bw = New-Object System.IO.BinaryWriter($fs)
    
    # ICONDIR header: 0 (reserved), 1 (type icon), count
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$bitmaps.Count)
    
    $pngStreams = @()
    foreach ($b in $bitmaps) {
        $ms = New-Object System.IO.MemoryStream
        $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngStreams += $ms
    }
    
    # Calculate offset after header (6 bytes) + directory entries (16 bytes each)
    $offset = 6 + (16 * $bitmaps.Count)
    
    for ($i = 0; $i -lt $bitmaps.Count; $i++) {
        $b = $bitmaps[$i]
        $ms = $pngStreams[$i]
        $w = if ($b.Width -ge 256) { [byte]0 } else { [byte]$b.Width }
        $h = if ($b.Height -ge 256) { [byte]0 } else { [byte]$b.Height }
        
        $bw.Write($w)             # width
        $bw.Write($h)             # height
        $bw.Write([byte]0)        # color count
        $bw.Write([byte]0)        # reserved
        $bw.Write([uint16]1)      # color planes
        $bw.Write([uint16]32)     # bits per pixel
        $bw.Write([uint32]$ms.Length) # data length
        $bw.Write([uint32]$offset)    # data offset
        
        $offset += $ms.Length
    }
    
    # Write image data
    foreach ($ms in $pngStreams) {
        $bytes = $ms.ToArray()
        $bw.Write($bytes, 0, $bytes.Length)
        $ms.Dispose()
    }
    
    $bw.Close()
    $fs.Close()
    Write-Host "Created ICO: $filePath"
}

Write-IcoFile $icoBitmaps "$destIcons\favicon.ico"
Write-IcoFile $icoBitmaps "$destPublic\favicon.ico"
Write-IcoFile $icoBitmaps "$destApp\favicon.ico"

foreach ($b in $icoBitmaps) { $b.Dispose() }
$croppedBmp.Dispose()
$bmp.Dispose()

Write-Host "Favicons and App Icons successfully created across all sizes!"
