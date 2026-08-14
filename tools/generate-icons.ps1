$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
  param([System.Drawing.RectangleF]$Rect, [float]$Radius)
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $Radius * 2
  $p.AddArc($Rect.X, $Rect.Y, $d, $d, 180, 90)
  $p.AddArc($Rect.Right - $d, $Rect.Y, $d, $d, 270, 90)
  $p.AddArc($Rect.Right - $d, $Rect.Bottom - $d, $d, $d, 0, 90)
  $p.AddArc($Rect.X, $Rect.Bottom - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-QlensIcon {
  param([int]$Size, [string]$OutPath)
  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $full = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $radius = $Size * 0.22
  $bgPath = New-RoundedRectPath -Rect $full -Radius $radius

  $c1 = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)
  $c2 = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($full, $c1, $c2, 45)
  $g.FillPath($brush, $bgPath)

  $lensD = $Size * 0.52
  $lensX = $Size * 0.16
  $lensY = $Size * 0.16
  $lensPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), [float]($Size * 0.085))
  $lensPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $lensPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawEllipse($lensPen, $lensX, $lensY, $lensD, $lensD)

  $glass = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 255, 255, 255))
  $g.FillEllipse($glass, $lensX, $lensY, $lensD, $lensD)

  $hx1 = $lensX + $lensD * 0.72
  $hy1 = $lensY + $lensD * 0.72
  $hx2 = $lensX + $lensD * 1.22
  $hy2 = $lensY + $lensD * 1.22
  $g.DrawLine($lensPen, $hx1, $hy1, $hx2, $hy2)

  $dir = Split-Path -Parent $OutPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $bgPath.Dispose(); $brush.Dispose()
  $lensPen.Dispose(); $glass.Dispose()
}

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root 'src\icons'
New-QlensIcon -Size 16 -OutPath (Join-Path $iconDir 'icon16.png')
New-QlensIcon -Size 32 -OutPath (Join-Path $iconDir 'icon32.png')
New-QlensIcon -Size 48 -OutPath (Join-Path $iconDir 'icon48.png')
New-QlensIcon -Size 128 -OutPath (Join-Path $iconDir 'icon128.png')
Write-Output 'Icons generated.'