# Empaqueta la app en un unico index.html para GitHub Pages.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
New-Item -ItemType Directory -Force -Path dist | Out-Null
$out = Join-Path $root 'dist\index.html'

function Read-Utf8([string]$path) {
  return [IO.File]::ReadAllText((Join-Path $root $path), [Text.Encoding]::UTF8)
}
function Read-B64([string]$path) {
  return [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $root $path)))
}

$css = Read-Utf8 'styles/main.css'
@(
  'cover-arena.svg',
  'cover-lanes.svg',
  'cover-water.svg',
  'cover-env-rad.svg',
  'cover-env-dire.svg'
) | ForEach-Object {
  $b64 = Read-B64 "assets/$_"
  $css = $css.Replace("../assets/$_", "data:image/svg+xml;base64,$b64")
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<!DOCTYPE html>')
[void]$sb.AppendLine('<html lang="es">')
[void]$sb.AppendLine('<head>')
[void]$sb.AppendLine('<meta charset="utf-8">')
[void]$sb.AppendLine('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
[void]$sb.AppendLine('<meta name="theme-color" content="#0a0d12">')
[void]$sb.AppendLine('<title>Dota 2 Career Simulator</title>')
[void]$sb.AppendLine('<meta name="description" content="Simulador de carrera profesional de Dota 2: de los pubs a The International, o a ninguna parte.">')
[void]$sb.AppendLine('<style>')
[void]$sb.AppendLine($css)
[void]$sb.AppendLine('</style>')
[void]$sb.AppendLine('</head>')
[void]$sb.AppendLine('<body>')
[void]$sb.AppendLine('<div id="root"></div>')

$pngs = Get-ChildItem (Join-Path $root 'assets\teams\*.png') | Sort-Object Name
[void]$sb.AppendLine('<script>window.DCS=window.DCS||{};DCS.assetsInline={')
$parts = foreach ($f in $pngs) {
  $id = [IO.Path]::GetFileNameWithoutExtension($f.Name)
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
  '"' + $id + '":"data:image/png;base64,' + $b64 + '"'
}
[void]$sb.AppendLine(($parts -join ",`n"))
[void]$sb.AppendLine('};</script>')

$index = Read-Utf8 'index.html'
[regex]::Matches($index, 'src="([^"]+\.js)"') | ForEach-Object {
  $rel = $_.Groups[1].Value
  [void]$sb.AppendLine('<script>')
  [void]$sb.AppendLine((Read-Utf8 $rel))
  [void]$sb.AppendLine('</script>')
}

[void]$sb.AppendLine('</body></html>')
[IO.File]::WriteAllText($out, $sb.ToString(), (New-Object Text.UTF8Encoding $false))
$len = (Get-Item $out).Length
Write-Host ("OK -> dist/index.html ({0:N0} bytes, {1} logos)" -f $len, $pngs.Count)
