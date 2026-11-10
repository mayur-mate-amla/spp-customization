# Puts screenshots side by side in one image (phone shots of several pages, for a scenario's before/after).
#   powershell -File scripts/montage.ps1 -Out docs/x/before.png -In "a.png,b.png,c.png"
param([Parameter(Mandatory)] [string] $Out, [Parameter(Mandatory)] [string] $In, [int] $Gap = 20)
Add-Type -AssemblyName System.Drawing
$images = ($In -split ',') | ForEach-Object { [System.Drawing.Image]::FromFile((Resolve-Path $_).Path) }
try {
  $width = [int](($images | Measure-Object -Property Width -Sum).Sum + $Gap * ($images.Count - 1))
  $height = [int](($images | Measure-Object -Property Height -Maximum).Maximum)
  $canvas = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.Clear([System.Drawing.Color]::White)
  $x = 0
  foreach ($image in $images) {
    $graphics.DrawImage($image, $x, 0, $image.Width, $image.Height)
    $x += $image.Width + $Gap
  }
  $canvas.Save([System.IO.Path]::GetFullPath($Out))
  $graphics.Dispose()
  $canvas.Dispose()
  "$Out  ($width x $height)"
} finally {
  $images | ForEach-Object { $_.Dispose() }
}
