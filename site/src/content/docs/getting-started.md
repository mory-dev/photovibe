---
title: Getting started
description: Install Photovibe on Windows, open your first photo, and learn your way around the workspace.
order: 1
---

Photovibe is a desktop photo editor that runs entirely on your own machine. There is no
account to create, nothing to sign in to, and no image ever leaves your computer.

## Install

1. Download the installer from [the download page](/download). It is a single `.exe`
   of a few megabytes.
2. Run it. Photovibe installs for the current user only, so it does not ask for
   administrator rights and does not touch system directories.
3. Launch **Photovibe** from the Start menu.

Windows may show a SmartScreen prompt the first time a new version is published, even
though every installer is Authenticode-signed. [Verifying your download](/docs/install-and-verify)
explains what the signature is and how to check it yourself.

## The workspace

![The Photovibe workspace with a photo open](/screenshots/hero.webp)

Photovibe uses a familiar dark, single-window layout:

- **Menu bar** — File, Edit, Image, Layer, Select, View, Filter and Help.
- **Options bar** — the row under the menus. Its contents change with the active tool:
  brush size for the brush, font and size for text, and so on.
- **Toolbar** — the tool column down the left edge. Every tool has a one-key shortcut.
- **Canvas** — your document, on a checkerboard that shows through transparency.
- **Properties** — document size, the active layer, its type, blend mode and colour.
- **Layers** — the layer stack, newest on top, with opacity and blend mode for the
  selected layer.
- **Status bar** — active tool, saved state, document size and zoom level.

## Open a photo

**File → Open…** (<kbd>Ctrl</kbd>+<kbd>O</kbd>) accepts PNG, JPEG and WebP. The image
becomes the bottom layer of a new document sized to match it, and the view zooms to fit.

You can also start from a blank canvas with **File → New…** (<kbd>Ctrl</kbd>+<kbd>N</kbd>),
choosing the dimensions and background yourself, or paste an image straight from the
clipboard with <kbd>Ctrl</kbd>+<kbd>V</kbd>.

## Move around

| Action | How |
|---|---|
| Zoom in / out | <kbd>Ctrl</kbd>+<kbd>+</kbd> / <kbd>Ctrl</kbd>+<kbd>-</kbd>, or the scroll wheel |
| Fit to screen | <kbd>Ctrl</kbd>+<kbd>0</kbd> |
| Actual size (100%) | <kbd>Ctrl</kbd>+<kbd>1</kbd> |
| Pan | Hold <kbd>Space</kbd> and drag, or two-finger scroll |
| Show a grid | **View → Show Grid** |

## Save your work

**File → Save** (<kbd>Ctrl</kbd>+<kbd>S</kbd>) writes back to the file you opened.
**File → Save As…** (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>) asks where to put it.
The status bar shows `(unsaved)` whenever the document has changes that are not yet on disk.

Every step you take is undoable with <kbd>Ctrl</kbd>+<kbd>Z</kbd>, and the Edit menu names
the exact action each undo will reverse.

## Next

- [Tools and shortcuts](/docs/tools-and-shortcuts) — all twelve tools and every keyboard shortcut
- [Layers and blend modes](/docs/layers-and-blend-modes) — stacking, opacity and the thirteen blend modes
- [Selections](/docs/selections) — marquee, lasso and magic wand
