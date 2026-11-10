# Publica o site:
# 1) Azure Storage ($web) — espelho / backup
# 2) Azure Static Web Apps (www.artur7anos.com.br) — produção do domínio
# Conta storage: startur7anos1512 | SWA: swa-artur-7anos | RG: rg-aniversario-artur

$ErrorActionPreference = 'Stop'
$sa = 'startur7anos1512'
$rg = 'rg-aniversario-artur'
$swa = 'swa-artur-7anos'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$deploy = Join-Path $env:TEMP 'artur7anos-deploy'

if (Test-Path $deploy) { Remove-Item $deploy -Recurse -Force }
New-Item -ItemType Directory -Path $deploy | Out-Null

Copy-Item (Join-Path $root 'index.html') $deploy
Copy-Item (Join-Path $root 'admin.html') $deploy
Copy-Item (Join-Path $root 'config.js') $deploy
Copy-Item (Join-Path $root 'styles.css') $deploy
Copy-Item (Join-Path $root 'convite_new.png') $deploy
if (Test-Path (Join-Path $root 'og-convite.jpg')) { Copy-Item (Join-Path $root 'og-convite.jpg') $deploy }
if (Test-Path (Join-Path $root 'favicon.png')) { Copy-Item (Join-Path $root 'favicon.png') $deploy }
if (Test-Path (Join-Path $root 'favicon.svg')) { Copy-Item (Join-Path $root 'favicon.svg') $deploy }
Copy-Item (Join-Path $root 'js') (Join-Path $deploy 'js') -Recurse
Copy-Item (Join-Path $root 'missao-sustentabilidade') (Join-Path $deploy 'missao-sustentabilidade') -Recurse
if (Test-Path (Join-Path $root 'missao-energia')) {
  Copy-Item (Join-Path $root 'missao-energia') (Join-Path $deploy 'missao-energia') -Recurse
}
if (Test-Path (Join-Path $root 'termo')) {
  Copy-Item (Join-Path $root 'termo') (Join-Path $deploy 'termo') -Recurse
}
if (Test-Path (Join-Path $root 'staticwebapp.config.json')) {
  Copy-Item (Join-Path $root 'staticwebapp.config.json') $deploy
}

Write-Host '1/2 Publicando no Storage ($web)...'
$key = az storage account keys list --account-name $sa --resource-group $rg --query "[0].value" -o tsv
az storage blob upload-batch --account-name $sa --account-key $key -d "`$web" -s $deploy --overwrite true -o none

Write-Host '2/2 Publicando no Static Web Apps (domínio)...'
$token = az staticwebapp secrets list --name $swa --resource-group $rg --query "properties.apiKey" -o tsv
if (-not $token) { throw 'Não foi possível obter o token do Static Web Apps.' }

$swaCli = Get-Command swa -ErrorAction SilentlyContinue
if (-not $swaCli) {
  Write-Host 'Instalando @azure/static-web-apps-cli...'
  npm install -g @azure/static-web-apps-cli | Out-Null
}

swa deploy $deploy --deployment-token $token --env production

Write-Host ''
Write-Host 'Publicado!'
Write-Host 'Domínio: https://www.artur7anos.com.br/admin.html'
Write-Host 'Storage: https://startur7anos1512.z20.web.core.windows.net/admin.html'
Write-Host 'SWA:     https://kind-moss-04e87e80f.6.azurestaticapps.net/admin.html'
