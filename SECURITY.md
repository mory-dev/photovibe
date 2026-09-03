# Security policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](https://github.com/mory-dev/photovibe/security/advisories/new)
rather than opening a public issue.

Include what the issue allows an attacker to do, the steps to reproduce it, and the
Photovibe version affected. You will get an acknowledgement, and a fix will be released as
promptly as the severity warrants.

## Scope

Photovibe is a local desktop application with no server component and no user accounts. It
processes image files you open, so the most relevant issues are around parsing untrusted
images, the Tauri command surface in `src-tauri/`, and the release supply chain.

## Release integrity

Every Windows release is:

- built by GitHub Actions from a public, tagged commit, on a clean runner
- signed with a public-trust Authenticode certificate through Azure Trusted Signing,
  authenticated by GitHub OIDC — no long-lived signing credential exists in this repository
- timestamped via RFC 3161, and published with a `SHA256SUMS` file

[Installing and verifying](https://photovibe.mory.dev/docs/install-and-verify) explains how
to check a download yourself. If a Photovibe installer fails signature verification, treat
it as untrusted and report it.

## Privacy

Photovibe does not upload your images, does not collect telemetry, and works entirely
offline. The only network request it makes is an optional version check against the GitHub
Releases API when you open Help → About Photovibe.
