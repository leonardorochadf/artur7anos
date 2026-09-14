# Publica o site estático no Azure Storage ($web)
# Conta: startur7anos1512 | RG: rg-aniversario-artur

$ErrorActionPreference = 'Stop'
$sa = 'startur7anos1512'
$rg = 'rg-aniversario-artur'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$deploy = Join-Path $env:TEMP 'artur7anos-deploy'

if (Test-Path $deploy) { Remove-Item $deploy -Recurse -Force }
New-Item -ItemType Directory -Path $deploy | Out-Null

Copy-Item (Join-Path $root 'index.html') $deploy
Copy-Item (Join-Path $root 'admin.html') $deploy
Copy-Item (Join-Path $root 'config.js') $deploy
Copy-Item (Join-Path $root 'styles.css') $deploy
Copy-Item (Join-Path $root 'convite_new.png') $deploy
if (Test-Path (Join-Path $root 'favicon.png')) { Copy-Item (Join-Path $root 'favicon.png') $deploy }
if (Test-Path (Join-Path $root 'favicon.svg')) { Copy-Item (Join-Path $root 'favicon.svg') $deploy }
Copy-Item (Join-Path $root 'js') (Join-Path $deploy 'js') -Recurse
Copy-Item (Join-Path $root 'missao-sustentabilidade') (Join-Path $deploy 'missao-sustentabilidade') -Recurse
if (Test-Path (Join-Path $root 'missao-energia')) {
  Copy-Item (Join-Path $root 'missao-energia') (Join-Path $deploy 'missao-energia') -Recurse
}
if (Test-Path (Join-Path $root 'staticwebapp.config.json')) {
  Copy-Item (Join-Path $root 'staticwebapp.config.json') $deploy
}

$key = az storage account keys list --account-name $sa --resource-group $rg --query "[0].value" -o tsv
az storage blob upload-batch --account-name $sa --account-key $key -d "`$web" -s $deploy --overwrite true -o none

Write-Host ''
Write-Host 'Publicado!'
Write-Host 'Convite: https://startur7anos1512.z20.web.core.windows.net/'
Write-Host 'Missão:  https://startur7anos1512.z20.web.core.windows.net/missao-sustentabilidade/'
Write-Host 'Admin:   https://startur7anos1512.z20.web.core.windows.net/admin.html'
