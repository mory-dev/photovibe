---
title: FAQ
description: Common questions about Photovibe — cost, licensing, privacy, file formats, platforms and PSD support.
order: 8
---

## Is Photovibe really free?

Yes. Free to download, free to use, free for commercial work. There is no paid tier, no
trial period, no watermark and no feature held back behind a purchase.

## Is it open source?

Yes, under the [MIT licence](https://github.com/mory-dev/photovibe/blob/master/LICENSE) —
one of the most permissive licences there is. You can read the code, modify it, ship your
own build, and use it inside commercial products.

## Do I need an account?

No. Photovibe has no sign-in, no user accounts and no licence keys.

## Does it upload my photos anywhere?

No. All editing happens locally, on your machine, using your CPU and GPU. Your images are
never uploaded, and Photovibe works with no network connection at all.

The one network request the app makes is in **Help → About Photovibe**, which asks the
GitHub Releases API whether a newer version exists. It sends no information about you or
your files, and it only happens when you open that dialog.

## Which platforms does it run on?

Windows today. The Tauri shell underneath already supports macOS and Linux, so those
builds are a matter of signing, notarisation and testing rather than a rewrite. See the
[roadmap](/docs/roadmap).

## Which file formats can it open?

PNG, JPEG and WebP, plus images pasted from the clipboard. Saving writes back to those
same formats.

## Can it open PSD files?

Not yet, and it is worth being straightforward about it: PSD is a large, undocumented
format, and partial support tends to be worse than none. If PSD import matters to you,
[say so on the issue tracker](https://github.com/mory-dev/photovibe/issues) — demand is
what decides priority.

## Is it a Photoshop clone?

No. It borrows the layout conventions — a tool column, a layers panel, blend modes,
familiar shortcuts — so that anyone who has used a layer-based editor is immediately at
home. It is a much smaller program with a much smaller scope. See the honest comparison on
[Photovibe vs Photoshop](/photoshop-alternative).

## How large is the download?

A few megabytes. Photovibe installs for the current user only, needs no administrator
rights, and installs no background service or updater.

## Why does Windows warn me when I run the installer?

Every release is Authenticode-signed via Azure Trusted Signing, but SmartScreen builds
reputation for each new version over time and may warn before enough people have
downloaded it. [Installing and verifying](/docs/install-and-verify) shows how to check the
signature and SHA-256 hash yourself.

## Does it support graphics tablets and pressure sensitivity?

Pen input works for drawing, but pressure sensitivity is not wired up to brush size or
opacity yet.

## How can I help?

Use it and file issues — bug reports and honest feedback about what feels wrong are the
most useful thing right now. Pull requests are welcome too; see
[building from source](/docs/build-from-source).
