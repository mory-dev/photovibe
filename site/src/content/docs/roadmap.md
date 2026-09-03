---
title: Roadmap
description: What Photovibe can do today, what is greyed out in the menus, and what is planned next.
order: 7
---

Photovibe is early software, and this page says plainly where it stands. If a menu entry
is greyed out in the app, it is listed below as not done — no feature is claimed here that
you cannot use today.

## Working today

**Documents**
- Open PNG, JPEG and WebP
- Create a blank document at any size, with a chosen background
- Paste an image from the clipboard
- Save and Save As
- Image resizing, and cropping with the Crop tool

**Layers**
- Unlimited image, paint, fill, text and background layers
- Per-layer opacity
- All thirteen blend modes, composited on the GPU
- Duplicate, delete, reorder by selection, and hide layers

**Editing**
- Brush, eraser, gradient and healing tools, all clipped to the active selection
- Editable text layers using any installed system font
- Eyedropper, including sampling from anywhere on screen in the desktop build
- A colour picker with a hue/saturation wheel and RGB, HSL, alpha and hex fields
- Rectangular, freehand and magic-wand selections
- Moving the selected pixels, or just the outline, with the Cursor tool
- Cut, copy and paste the selected region
- Full undo/redo history, with each step named

**Adjustments and filters**
- Brightness/contrast, exposure, hue/saturation, levels, invert, grayscale, sepia
- Gaussian blur, sharpen, vignette and noise
- All of them apply to the selection when there is one, with a live preview

**Application**
- Windows desktop build, signed with Azure Trusted Signing
- Entirely offline; no account, telemetry or network calls beyond an update check
- Update check against GitHub Releases in Help → About

## Not implemented yet

These appear in the menus, greyed out:

| Feature | Menu |
|---|---|
| Export PNG / JPEG / WebP dialogs | File |
| Open Recent | File |
| Canvas Size | Image |
| Rotate Canvas, Flip Horizontal, Flip Vertical | Image |
| Layer Mask | Layer |
| Inverse selection | Select |
| Refine Edge | Select |
| Filter Gallery, Apply Last Filter | Filter |
| Keyboard Shortcuts reference | Help |

## Planned

Roughly in the order we intend to tackle them:

1. **Export dialogs** — explicit PNG, JPEG and WebP export with quality control, rather
   than saving back over the source file.
2. **Layer masks** — non-destructive masking, the single biggest gap against Photoshop.
3. **Adjustment layers** — the adjustments above, applied non-destructively on their own
   layer rather than baked into the pixels.
4. **Canvas transforms** — canvas size, rotate and flip.
5. **Selection refinement** — invert, feather, grow and shrink.
6. **macOS and Linux builds** — the Tauri shell already supports both; they need signing,
   notarisation and testing before we publish them.

## Ideas and requests

The roadmap is not fixed. If something you need is missing, open an issue at
[github.com/mory-dev/photovibe/issues](https://github.com/mory-dev/photovibe/issues) —
what people actually ask for moves up this list.
