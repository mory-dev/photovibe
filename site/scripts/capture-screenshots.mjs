/**
 * Captures the product screenshots used across photovibe.mory.dev.
 *
 * Every image is the real Photovibe interface driven through real interactions
 * - not a mockup. The app runs in Chromium via `pnpm dev`; because
 * `tauri.conf.json` sets `decorations: false`, the window chrome is the app's
 * own HTML, so a browser capture is pixel-identical to the desktop window.
 * `AppShell.handleOpen` falls back to an <input type="file"> when Tauri is
 * absent, which is how a photo gets onto the canvas here.
 *
 *   pnpm capture            # all scenes
 *   pnpm capture hero       # one scene
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const SITE_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REPO_DIR = path.resolve(SITE_DIR, '..');
const OUT_DIR = path.join(SITE_DIR, 'public', 'screenshots');
const SAMPLES = path.join(SITE_DIR, 'src', 'assets', 'samples');
const APP_URL = 'http://localhost:1420';

const WIDTH = 1440;
const HEIGHT = 900;
const SCALE = 2;

const photo = (name) => path.join(SAMPLES, name);

/* ------------------------------------------------------------------ helpers */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error(`Dev server never became ready at ${url}`);
}

/** Waits out the splash + skeleton sequence in AppShell. */
async function waitForEditor(page) {
  await page.waitForSelector('button[aria-label="Move"]', { timeout: 60_000 });
  await page.waitForSelector('aside ul li select', { timeout: 60_000 });
  await sleep(700);
}

/** Clicks a top-level menu, then an item inside it, by visible label. */
async function menu(page, menuLabel, itemLabel) {
  await page.getByRole('button', { name: menuLabel, exact: true }).click();
  await page.getByRole('menuitem', { name: itemLabel }).first().click();
  await sleep(300);
}

async function tool(page, label) {
  await page.click(`button[aria-label="${label}"]`);
  await sleep(250);
}

/** Counts rows currently in the layer list. */
const layerCount = (page) => page.locator('aside ul li').count();

/**
 * Opens a photo through the browser file-input fallback in handleOpen, and
 * waits until the layer actually lands - openImageFile replaces the whole
 * document, so acting too early silently discards the edit.
 */
async function openPhoto(page, file) {
  const expected = path.basename(file, path.extname(file));
  const chooser = page.waitForEvent('filechooser');
  await menu(page, 'File', 'Open');
  (await chooser).setFiles(file);
  await page.locator('aside ul li', { hasText: expected }).first().waitFor({ timeout: 30_000 });
  await sleep(1500);
}

/** Drags across the canvas in fractions of its bounding box. */
async function dragOnCanvas(page, from, to, { steps = 24, hold = 0 } = {}) {
  const box = await page.locator('.pv-canvas').first().boundingBox();
  if (!box) throw new Error('Canvas not found');
  const at = (p) => [box.x + box.width * p[0], box.y + box.height * p[1]];
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps);
    if (hold) await sleep(hold);
  }
  await page.mouse.up();
  await sleep(500);
}

/** Single click at a fractional canvas position. */
async function clickCanvas(page, point) {
  const box = await page.locator('.pv-canvas').first().boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(box.x + box.width * point[0], box.y + box.height * point[1]);
  await sleep(400);
}

/** Freehand stroke through a list of fractional canvas points. */
async function strokeOnCanvas(page, points) {
  const box = await page.locator('.pv-canvas').first().boundingBox();
  if (!box) throw new Error('Canvas not found');
  const at = (p) => [box.x + box.width * p[0], box.y + box.height * p[1]];
  const [sx, sy] = at(points[0]);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (const point of points.slice(1)) {
    const [px, py] = at(point);
    await page.mouse.move(px, py, { steps: 14 });
  }
  await page.mouse.up();
  await sleep(500);
}

/**
 * Writes each scene twice: a 1x WebP for normal displays and a 2x for retina.
 * A full-resolution PNG of a 2880px editor screenshot is ~5 MB, which has no
 * business on a landing page, so WebP is the only shipped format.
 */
async function save(page, name) {
  const raw = await page.screenshot({ type: 'png' });
  await sharp(raw).resize({ width: WIDTH }).webp({ quality: 84 })
    .toFile(path.join(OUT_DIR, `${name}.webp`));
  await sharp(raw).resize({ width: WIDTH * SCALE }).webp({ quality: 74 })
    .toFile(path.join(OUT_DIR, `${name}@2x.webp`));
  console.log(`  saved ${name}.webp (${WIDTH}px) + @2x (${WIDTH * SCALE}px)`);
}

/* ------------------------------------------------------------------- scenes */

const scenes = {
  /** Landing hero: a photo open, layers panel populated, canvas fitted. */
  async hero(page) {
    await openPhoto(page, photo('canyon-river.jpg'));
    await tool(page, 'Move');
    await save(page, 'hero');
  },

  /** Layers stacked with a blend mode and reduced opacity. */
  async layers(page) {
    await openPhoto(page, photo('canyon-river.jpg'));
    const before = await layerCount(page);
    await page.click('button[aria-label="New fill layer"]');
    await page.waitForFunction(
      (n) => document.querySelectorAll('aside ul li').length > n,
      before,
      { timeout: 15_000 },
    );
    await sleep(500);
    await page.locator('aside ul select').first().selectOption('overlay');
    await sleep(500);
    // The layer list is the <ul> inside InspectorPanel; the brush slider sits
    // above it in the properties section, so scope to the list.
    const opacity = page.locator('aside ul input[type="range"]').first();
    await opacity.fill('62');
    await opacity.dispatchEvent('input');
    await sleep(700);
    await save(page, 'layers');
  },

  /** Marching-ants selection made with the marquee tool. */
  async selections(page) {
    await openPhoto(page, photo('canyon-river.jpg'));
    await tool(page, 'Marquee');
    await dragOnCanvas(page, [0.24, 0.26], [0.68, 0.74], { hold: 10 });
    await save(page, 'selections');
  },

  /**
   * A real retouching flow: sample a colour off the photo with the eyedropper,
   * then paint with it on a fresh layer, clear of the subject.
   */
  async brush(page) {
    await openPhoto(page, photo('portrait.jpg'));

    await tool(page, 'Eyedropper');
    await clickCanvas(page, [0.22, 0.12]);

    const before = await layerCount(page);
    await menu(page, 'Layer', 'New Layer');
    await page.waitForFunction(
      (n) => document.querySelectorAll('aside ul li').length > n,
      before,
      { timeout: 15_000 },
    );
    await sleep(400);

    await tool(page, 'Brush');
    const size = page.locator('aside input[type="range"]').first();
    await size.fill('58');
    await size.dispatchEvent('input');
    await sleep(400);

    await strokeOnCanvas(page, [
      [0.08, 0.9], [0.17, 0.86], [0.27, 0.89], [0.37, 0.85], [0.46, 0.88],
    ]);
    await strokeOnCanvas(page, [
      [0.1, 0.79], [0.19, 0.76], [0.29, 0.79],
    ]);
    await save(page, 'brush');
  },

  /** A committed text layer, with the font and size controls in the options bar. */
  async text(page) {
    await openPhoto(page, photo('dog.jpg'));
    await tool(page, 'Text');
    await clickCanvas(page, [0.09, 0.22]);
    // CanvasViewport renders an inline input for the text draft; Enter commits
    // it as a real text layer.
    const field = page.locator('.pv-canvas input[type="text"], .pv-canvas input:not([type])').first();
    await field.waitFor({ timeout: 15_000 });
    await field.type('Golden hour', { delay: 45 });
    await sleep(400);
    await page.keyboard.press('Enter');
    await sleep(900);
    await save(page, 'text');
  },

  /** About dialog: version, update check, link back to the site. */
  async about(page) {
    await openPhoto(page, photo('canyon-river.jpg'));
    await menu(page, 'Help', 'About Photovibe');
    await sleep(1500);
    await save(page, 'about');
  },

  /** Empty workspace - used on docs pages that describe the interface. */
  async workspace(page) {
    await tool(page, 'Move');
    await sleep(500);
    await save(page, 'workspace');
  },
};

/* ----------------------------------------------------------- open graph card */

/**
 * Renders scripts/og-template.html at exactly 1200x630 into public/og.png.
 * Runs against a file:// URL, so it does not need the app.
 */
async function captureOgImage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(new URL('og-template.html', import.meta.url).href, { waitUntil: 'load' });
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );
  const raw = await page.screenshot({ type: 'png' });
  await sharp(raw).png({ compressionLevel: 9 }).toFile(path.join(SITE_DIR, 'public', 'og.png'));
  await context.close();
  console.log('  saved og.png (1200x630)');
}

/* --------------------------------------------------------------------- main */

async function main() {
  const requested = process.argv.slice(2);
  const ogOnly = requested.length === 1 && requested[0] === 'og';
  const names = requested.length && !ogOnly ? requested : Object.keys(scenes);
  for (const name of names) {
    if (!scenes[name]) {
      throw new Error(`Unknown scene "${name}". Known: ${Object.keys(scenes).join(', ')}`);
    }
  }

  await mkdir(OUT_DIR, { recursive: true });

  if (ogOnly) {
    const browser = await chromium.launch();
    try {
      console.log('\n> og');
      await captureOgImage(browser);
    } finally {
      await browser.close();
    }
    return;
  }

  console.log('Starting Photovibe dev server...');
  const server = spawn('pnpm', ['dev'], {
    cwd: REPO_DIR,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  // SwiftShader keeps the WebGL compositor on the real code path headlessly;
  // CanvasViewport falls back to 2D only if WebGL is unavailable.
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    await waitForServer(APP_URL);
    console.log(`Dev server ready at ${APP_URL}`);

    for (const name of names) {
      console.log(`\n> ${name}`);
      const context = await browser.newContext({
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: SCALE,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      await waitForEditor(page);
      await scenes[name](page);
      await context.close();
    }

    console.log('\nAll scenes captured.');
  } finally {
    await browser.close();
    // Vite spawns a child process on Windows; make sure the port is released.
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
