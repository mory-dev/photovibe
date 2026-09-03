---
title: Tools and shortcuts
description: Every Photovibe tool, what it does, and the complete keyboard shortcut reference.
order: 2
---

Photovibe has twelve tools in the left-hand column. Each has a single-key shortcut that
works whenever you are not typing into a field.

## The toolbar

| Tool | Key | What it does |
|---|---|---|
| Cursor | <kbd>A</kbd> | Click a layer to select it. With a selection active, drag to move the selected pixels, or <kbd>Alt</kbd>-drag to move just the outline. |
| Move | <kbd>V</kbd> | Drag the active layer around the canvas. <kbd>Alt</kbd>-drag moves the current selection instead. |
| Marquee | <kbd>M</kbd> | Drag out a rectangular selection. |
| Lasso | <kbd>L</kbd> | Draw a freehand selection. |
| Brush | <kbd>B</kbd> | Paint with a soft round brush in the foreground colour. |
| Magic Wand | <kbd>W</kbd> | Select a contiguous region of similar colour. |
| Crop | <kbd>C</kbd> | Drag out a region and commit it to trim the document. |
| Eyedropper | <kbd>I</kbd> | Sample a colour and make it the foreground colour. |
| Text | <kbd>T</kbd> | Click to place a text layer; type, then press <kbd>Enter</kbd>. |
| Healing | <kbd>J</kbd> | Blend a blemish away using surrounding pixels. |
| Eraser | <kbd>E</kbd> | Erase to transparency on any pixel layer. |
| Gradient | <kbd>G</kbd> | Drag to draw a linear gradient from the foreground colour. |

### Brush and eraser

![Painting with a sampled colour on a new layer](/screenshots/brush.webp)

The options bar shows the current colour and a size slider while the brush, eraser or
healing tool is active. You can also resize without leaving the canvas: hold <kbd>Alt</kbd>
and right-drag. The cursor stays pinned while you drag and returns to where it started, and
the ring previews the size as you go.

Strokes are clipped to the active selection, so a marquee or lasso is the simplest way to
confine painting to one part of the image.

Painting on an image layer edits that image directly. If you would rather keep the
original intact, add a layer first with **Layer → New Layer**
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd>) and paint on that.

### Eyedropper

Click anywhere on the canvas to make that colour the foreground colour. In the desktop
build the eyedropper can also sample from outside the Photovibe window — anywhere on your
screen — which is useful for matching a colour from another application.

Once you pick a colour, Photovibe switches back to whichever tool you were using before, so
sampling mid-stroke costs nothing.

### Choosing a colour directly

Click the colour swatch in the options bar, or the one in the properties panel, to open the
colour picker: a hue and saturation wheel with a value slider, plus RGB, HSL, alpha and hex
fields.

### Text

![A committed text layer above the photo](/screenshots/text.webp)

Pick the Text tool, click where the text should start, and type. The options bar lets you
choose any font installed on your system and set the size. Press <kbd>Enter</kbd> to
commit it as a real text layer, or <kbd>Esc</kbd> to abandon it. Clicking an existing text
layer with the Text tool reopens it for editing.

## Keyboard shortcuts

### File

| Action | Shortcut |
|---|---|
| New document | <kbd>Ctrl</kbd>+<kbd>N</kbd> |
| Open | <kbd>Ctrl</kbd>+<kbd>O</kbd> |
| Save | <kbd>Ctrl</kbd>+<kbd>S</kbd> |
| Save As | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> |

### Edit

| Action | Shortcut |
|---|---|
| Undo | <kbd>Ctrl</kbd>+<kbd>Z</kbd> |
| Redo | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd> |
| Copy the selected region | <kbd>Ctrl</kbd>+<kbd>C</kbd> |
| Cut the selected region | <kbd>Ctrl</kbd>+<kbd>X</kbd> |
| Paste image from clipboard | <kbd>Ctrl</kbd>+<kbd>V</kbd> |

### Layer

| Action | Shortcut |
|---|---|
| New layer | <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd> |
| Duplicate layer | <kbd>Ctrl</kbd>+<kbd>J</kbd> |

### Select

| Action | Shortcut |
|---|---|
| Select all | <kbd>Ctrl</kbd>+<kbd>A</kbd> |
| Deselect | <kbd>Ctrl</kbd>+<kbd>D</kbd> or <kbd>Esc</kbd> |

### Image and View

| Action | Shortcut |
|---|---|
| Image size | <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>I</kbd> |
| Show / hide grid | <kbd>Ctrl</kbd>+<kbd>'</kbd> |
| Zoom in | <kbd>Ctrl</kbd>+<kbd>+</kbd> |
| Zoom out | <kbd>Ctrl</kbd>+<kbd>-</kbd> |
| Fit to screen | <kbd>Ctrl</kbd>+<kbd>0</kbd> |
| Actual size | <kbd>Ctrl</kbd>+<kbd>1</kbd> |

### On the canvas

| Action | How |
|---|---|
| Pan | Hold <kbd>Space</kbd> and drag |
| Zoom | Scroll wheel |
| Resize brush | <kbd>Alt</kbd>+right-drag |
| Move the selected pixels | Drag inside the selection with the Cursor tool |
| Move the selection outline | <kbd>Alt</kbd>-drag with the Cursor tool |
| Add an image | Drag an image file onto the canvas |
