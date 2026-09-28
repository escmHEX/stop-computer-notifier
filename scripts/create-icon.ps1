Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = 'AntiAlias'
$graphics.Clear([System.Drawing.Color]::Transparent)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#315d9a'))
$graphics.FillEllipse($brush, 4,4,248,248)
$graphics.FillRectangle([System.Drawing.Brushes]::White, 85,76,29,104)
$graphics.FillRectangle([System.Drawing.Brushes]::White, 142,76,29,104)
$bitmap.Save((Join-Path $PWD 'assets/icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $brush.Dispose(); $bitmap.Dispose()
$png = [System.IO.File]::ReadAllBytes((Join-Path $PWD 'assets/icon.png'))
$stream = [System.IO.File]::Create((Join-Path $PWD 'assets/icon.ico'))
$writer = New-Object System.IO.BinaryWriter $stream
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$png.Length); $writer.Write([uint32]22); $writer.Write($png)
$writer.Dispose()
