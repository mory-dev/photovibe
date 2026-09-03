# Attach Photovibe's GitHub release environment to the same Azure Artifact
# Signing account/certificate used by OpenTheBook and the other desktop apps.
#
# Prerequisites: Azure CLI logged in, GitHub CLI logged in, this repo on GitHub.
#
# Usage:
#   pwsh scripts/setup-azure-signing.ps1
#   pwsh scripts/setup-azure-signing.ps1 -AppDisplayName openthebook-github-release

param(
  [string]$Repo = "mory-dev/photovibe",
  [string]$AppDisplayName = "openthebook-github-release"
)

$ErrorActionPreference = "Stop"

az account show --query id -o tsv | Out-Null

$appId = az ad app list --display-name $AppDisplayName --query "[0].appId" -o tsv
if (-not $appId) {
  throw "Could not find Entra app '$AppDisplayName'. Pass -AppDisplayName if the shared GitHub signing app uses another name."
}

$appObjectId = az ad app show --id $appId --query id -o tsv
az ad app federated-credential create `
  --id $appObjectId `
  --parameters infra/azure/github-photovibe-release-federated-credential.json

$accounts = az resource list --resource-type Microsoft.CodeSigning/codeSigningAccounts | ConvertFrom-Json
if (-not $accounts) { throw "No Azure Artifact Signing accounts were found in this subscription." }
$account = $accounts[0]
$profiles = az resource list --resource-group $account.resourceGroup --resource-type Microsoft.CodeSigning/codeSigningAccounts/certificateProfiles | ConvertFrom-Json
$profile = $profiles[0]
if (-not $profile) { throw "No certificate profiles were found on $($account.name)." }

$spObjectId = az ad sp show --id $appId --query id -o tsv
az role assignment create `
  --assignee-object-id $spObjectId `
  --assignee-principal-type ServicePrincipal `
  --role "Artifact Signing Certificate Profile Signer" `
  --scope $profile.id

$tenantId = az account show --query tenantId -o tsv
$subscriptionId = az account show --query id -o tsv

$appId | gh secret set AZURE_CLIENT_ID --repo $Repo --env release
$tenantId | gh secret set AZURE_TENANT_ID --repo $Repo --env release
$subscriptionId | gh secret set AZURE_SUBSCRIPTION_ID --repo $Repo --env release
$account.name | gh secret set AZURE_ACCOUNT_NAME --repo $Repo --env release
($profile.name -split "/")[-1] | gh secret set AZURE_CERT_PROFILE_NAME --repo $Repo --env release
gh variable set AZURE_ENDPOINT --env release --repo $Repo --body "https://eus.codesigning.azure.net/"

Write-Output "Attached $Repo to $($account.name) / $($profile.name)"
Write-Output "AZURE_CLIENT_ID=$appId"
