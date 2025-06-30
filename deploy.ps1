# Variables
$frontendDir = "frontend"
$backendDir = "backend"
$herokuDir = "heroku"
$herokuPublicDir = "$herokuDir/public"
$backendBuildDir = "$backendDir/dist"

Write-Host "`nLimpiando contenido de la carpeta 'heroku' (exceptuando .git)..."
if (Test-Path $herokuDir) {
    Get-ChildItem $herokuDir -Force | Where-Object {
        $_.Name -ne ".git"
    } | Remove-Item -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $herokuDir | Out-Null
}
New-Item -ItemType Directory -Path $herokuPublicDir -Force | Out-Null

# Build frontend
Write-Host "`nConstruyendo frontend con Vite..."
cd $frontendDir
npx vite build --mode production
cd ..

# Copiar frontend compilado a heroku/public
Write-Host "`nCopiando frontend a heroku/public..."
Copy-Item "$frontendDir/dist/*" -Destination $herokuPublicDir -Recurse

# Compilar backend
Write-Host "`nCompilando backend TypeScript..."
cd $backendDir
npx tsc
cd ..

# Copiar todo el backend (excepto node_modules) a heroku/
Write-Host "`nCopiando backend completo (excepto node_modules) a heroku..."
Get-ChildItem -Path $backendDir -Recurse -Force |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
    ForEach-Object {
        $destination = $_.FullName -replace [regex]::Escape($backendDir), $herokuDir
        if ($_.PSIsContainer) {
            if (-not (Test-Path $destination)) {
                New-Item -ItemType Directory -Path $destination | Out-Null
            }
        } else {
            Copy-Item $_.FullName -Destination $destination -Force
        }
    }

# Copiar archivos necesarios para el deploy
Write-Host "`nCopiando package.json y Procfile..."
Copy-Item "$backendDir/package.json" -Destination $herokuDir
Copy-Item "$backendDir/Procfile" -Destination $herokuDir

Write-Host "`n✅ Deploy listo en la carpeta 'heroku'."
Write-Host "👉 Ejecutá:"
Write-Host "cd heroku"
Write-Host "git add . && git commit -m 'Deploy' && git push heroku main --force`n"
