# Azure Artifact Signing for Photovibe

Photovibe reuses the same Azure Artifact Signing account and public-trust
certificate as OpenTheBook and the other desktop apps. The release workflow
matches OpenTheBook: GitHub OIDC login, then
`azure/artifact-signing-action@v2` on the NSIS installer.

## Attach this repo to the existing certificate

```powershell
az login
gh auth login
pwsh scripts/setup-azure-signing.ps1
```

The script adds a federated credential for `mory-dev/photovibe` environment
`release` on the shared Entra app (default `openthebook-github-release`),
grants **Artifact Signing Certificate Profile Signer** on the existing
profile, and writes the same secret names OpenTheBook uses:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_ACCOUNT_NAME`
- `AZURE_CERT_PROFILE_NAME`
- variable `AZURE_ENDPOINT`

Create the GitHub `release` environment before running the script.

## Publish

```powershell
gh workflow run release.yml --ref master --field version=0.1.0
```

Or push a `v0.1.0` tag. Help → About Photovibe then reads
`mory-dev/photovibe` releases for the latest installer.
