---
title: Installing and verifying
description: How Photovibe installers are code-signed with Azure Trusted Signing, and how to verify a download yourself.
order: 5
---

Every Photovibe release for Windows is built by GitHub Actions, signed with a
public-trust Authenticode certificate through **Azure Trusted Signing**, and published to
GitHub Releases together with a `SHA256SUMS` file. Nothing is built or signed on a
developer's laptop.

## Install

The installer is an NSIS `.exe` that installs **for the current user only**. It does not
require administrator rights, does not write to `Program Files`, and does not install a
service, a scheduled task or a background updater.

## If Windows SmartScreen appears

SmartScreen builds reputation per signed application over time. A brand-new version can
trigger "Windows protected your PC" before it has been downloaded enough times, even
though the file is correctly signed.

Before clicking through any such prompt, confirm the file is genuinely ours:

1. Click **More info**. The publisher line should name the certificate holder, not
   "Unknown publisher". An unsigned or tampered file will say Unknown publisher — stop
   there.
2. Better still, verify the signature and hash yourself as below.

## Verify the Authenticode signature

In PowerShell, from the folder containing the installer:

```powershell
Get-AuthenticodeSignature .\Photovibe_0.1.0_x64-setup.exe |
  Format-List Status, StatusMessage, SignerCertificate
```

You want `Status : Valid`. The `SignerCertificate` subject identifies the publisher, and
the signature carries an RFC 3161 timestamp, so it stays valid after the signing
certificate itself expires.

You can see the same information in Explorer: right-click the file →
**Properties** → **Digital Signatures**.

## Verify the SHA-256 hash

Each release ships a `SHA256SUMS` file listing the digest of every artifact.

```powershell
Get-FileHash -Algorithm SHA256 .\Photovibe_0.1.0_x64-setup.exe
```

Compare the result with the matching line in `SHA256SUMS`. They must match exactly, case
aside.

## How the signing pipeline works

For anyone auditing the supply chain, the whole flow is in
[`.github/workflows/release.yml`](https://github.com/mory-dev/photovibe/blob/master/.github/workflows/release.yml):

1. A `v*` tag, or a manual dispatch, starts the release job on a clean
   `windows-latest` runner.
2. The runner checks out the tagged commit with `persist-credentials: false`, sets the
   version, and runs `pnpm tauri build --bundles nsis`.
3. It authenticates to Azure using **GitHub OIDC** — there is no long-lived Azure
   credential stored in the repository. The federated credential is scoped to this
   repository and its `release` environment.
4. `azure/artifact-signing-action@v2` signs the installer with SHA-256 digests and an
   RFC 3161 timestamp from `timestamp.acs.microsoft.com`.
5. The signed installer and a generated `SHA256SUMS` are uploaded and attached to the
   GitHub Release.

Because the private key never leaves Azure and the workflow has no ambient credentials,
a signed Photovibe installer can only be produced by a tagged build of this repository.

## Uninstall

Photovibe appears in **Settings → Apps → Installed apps** like any other program. It
stores no data outside its own install directory and the files you explicitly save.
