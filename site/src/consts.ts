export const SITE_URL = 'https://photovibe.mory.dev';
export const SITE_NAME = 'Photovibe';
export const REPO = 'mory-dev/photovibe';
export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;

export const TAGLINE = 'A free, open-source photo editor for Windows.';

export const DESCRIPTION =
  'Photovibe is a free and open-source photo editor for Windows — a local-first Photoshop alternative with layers, blend modes and selections. No account, no cloud, no subscription. MIT licensed.';

export const KEYWORDS = [
  'free open source photoshop alternative',
  'open source photo editor',
  'free photoshop alternative',
  'photoshop alternative windows',
  'free photo editor windows',
  'offline photo editor',
  'layer based image editor',
  'gimp alternative',
  'photoshop alternative no subscription',
  'local photo editor no cloud',
];

/** Tools, mirrored from src/components/Toolbar.tsx. */
export const TOOLS = [
  { name: 'Cursor', key: 'A', blurb: 'Inspect and pick layers without moving them.' },
  { name: 'Move', key: 'V', blurb: 'Reposition the active layer on the canvas.' },
  { name: 'Marquee', key: 'M', blurb: 'Rectangular selections with live marching ants.' },
  { name: 'Lasso', key: 'L', blurb: 'Freehand selections drawn by dragging.' },
  { name: 'Brush', key: 'B', blurb: 'Paint with an adjustable soft round brush.' },
  { name: 'Magic Wand', key: 'W', blurb: 'Select contiguous colour regions by tolerance.' },
  { name: 'Crop', key: 'C', blurb: 'Trim the document down to a region.' },
  { name: 'Eyedropper', key: 'I', blurb: 'Sample any colour, including from outside the window.' },
  { name: 'Text', key: 'T', blurb: 'Add text layers using your installed system fonts.' },
  { name: 'Healing', key: 'J', blurb: 'Blend away blemishes from surrounding pixels.' },
  { name: 'Eraser', key: 'E', blurb: 'Erase to transparency on any pixel layer.' },
  { name: 'Gradient', key: 'G', blurb: 'Draw linear gradients from the foreground colour.' },
] as const;

/** Blend modes, mirrored from src/engine/document/types.ts. */
export const BLEND_MODES = [
  'Normal', 'Multiply', 'Screen', 'Overlay', 'Soft Light', 'Hard Light', 'Colour Dodge',
  'Colour Burn', 'Darken', 'Lighten', 'Difference', 'Exclusion', 'Luminosity',
] as const;

/**
 * Honest status board. `done` entries map to enabled actions in
 * src/app/AppShell.tsx; `next` entries map to the ones still marked disabled.
 */
export const WORKS_TODAY = [
  'Multi-layer documents with per-layer opacity and 13 blend modes',
  'Open PNG, JPEG and WebP files; save your work back to disk',
  'Rectangular, freehand and magic-wand selections that clip every edit',
  'Brush, eraser, gradient, healing and text tools',
  'Brightness, exposure, hue/saturation, levels, blur, sharpen and more',
  'Cut, copy and paste the selected region',
  'Drag an image in from the desktop, or paste one from the clipboard',
  'A colour picker with a wheel and RGB, HSL and hex fields',
  'Full undo/redo history with named steps',
  'Image resizing, cropping and a fit-to-screen canvas',
  'GPU compositing through a custom WebGL engine',
];

export const COMING_NEXT = [
  'Dedicated PNG / JPEG / WebP export dialogs',
  'Layer masks and non-destructive adjustment layers',
  'Canvas size, rotate and flip',
  'Invert and refine-edge for selections',
  'macOS and Linux builds',
];
