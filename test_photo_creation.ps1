Add-Type -AssemblyName System.Drawing

# Create before photo
$bmp = New-Object System.Drawing.Bitmap(400, 300)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.Clear([System.Drawing.Color]::LightBlue)
$font = New-Object System.Drawing.Font('Arial', 20)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$graphics.DrawString('Test Before Photo', $font, $brush, 50, 130)
$graphics.Dispose()
$bmp.Save('test_before_photo.jpg', [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()

# Create after photo
$bmp2 = New-Object System.Drawing.Bitmap(400, 300)
$graphics2 = [System.Drawing.Graphics]::FromImage($bmp2)
$graphics2.Clear([System.Drawing.Color]::LightGreen)
$font2 = New-Object System.Drawing.Font('Arial', 20)
$brush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$graphics2.DrawString('Test After Photo', $font2, $brush2, 50, 130)
$graphics2.Dispose()
$bmp2.Save('test_after_photo.jpg', [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp2.Dispose()

Write-Host "Test photos created successfully"
