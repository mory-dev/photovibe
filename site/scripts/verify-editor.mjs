/**
 * Behavioural checks that drive the real editor in a browser and assert on
 * what actually lands on the canvas. These cover the things unit tests cannot:
 * pointer interaction, clipping, and compositing.
 *
 *   pnpm verify              # every check
 *   pnpm verify brush-clip   # one check
 *
 * Runs against `pnpm dev` at the repo root. Tauri-only paths are skipped here;
 * those are covered by the manual QA flow in docs/qa-flow.md.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SITE_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const REPO_DIR = path.resolve(SITE_DIR, '..');
const APP_URL = 'http://localhost:1420';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ helpers */

async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  throw new Error(`dev server never came up at ${url}`);
}

async function waitForEditor(page) {
  await page.waitForSelector('button[aria-label="Move"]', { timeout: 60_000 });
  await page.waitForSelector('aside ul li select', { timeout: 60_000 });
  await sleep(800);
}

const tool = async (page, label) => {
  await page.click(`button[aria-label="${label}"]`);
  await sleep(200);
};

async function canvasBox(page) {
  const box = await page.locator('.pv-canvas').first().boundingBox();
  if (!box) throw new Error('canvas not found');
  return box;
}

async function drag(page, from, to, steps = 24) {
  const box = await canvasBox(page);
  const at = (p) => [box.x + box.width * p[0], box.y + box.height * p[1]];
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps);
  }
  await page.mouse.up();
  await sleep(500);
}

/** Reads pixels off the live canvas at fractional positions. */
async function samplePixels(page, points) {
  // A mid-run hot reload can briefly unmount the canvas; wait it out rather
  // than failing with an opaque null dereference.
  await page.waitForSelector('.pv-canvas canvas', { timeout: 15_000 });
  return page.evaluate((pts) => {
    const canvas = document.querySelector('.pv-canvas canvas');
    if (!canvas) throw new Error('canvas disappeared while sampling');
    const probe = document.createElement('canvas');
    probe.width = canvas.width;
    probe.height = canvas.height;
    const ctx = probe.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    return pts.map(([fx, fy]) => {
      const d = ctx.getImageData(Math.round(canvas.width * fx), Math.round(canvas.height * fy), 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: d[3] };
    });
  }, points);
}

const isDark = (c) => c.r < 90 && c.g < 90 && c.b < 90;

async function setBrushSize(page, value) {
  const size = page.locator('aside input[type="range"]').first();
  await size.fill(String(value));
  await size.dispatchEvent('input');
  await sleep(300);
}

/* ------------------------------------------------------------------- checks */

const checks = {
  /** #3 — brush and eraser must not paint outside an active selection. */
  async 'brush-clip'(page) {
    await tool(page, 'Marquee');
    await drag(page, [0.35, 0.3], [0.65, 0.7]);

    await tool(page, 'Brush');
    await setBrushSize(page, 40);
    await drag(page, [0.1, 0.5], [0.9, 0.5], 40);

    const [left, insideA, insideB, right] = await samplePixels(page, [
      [0.18, 0.5],
      [0.42, 0.5],
      [0.58, 0.5],
      [0.82, 0.5],
    ]);

    const problems = [];
    if (!isDark(insideA) || !isDark(insideB)) problems.push('no paint landed inside the selection');
    if (isDark(left)) problems.push(`paint leaked left of the selection (${left.r},${left.g},${left.b})`);
    if (isDark(right)) problems.push(`paint leaked right of the selection (${right.r},${right.g},${right.b})`);
    return problems;
  },

  /** #3 — with no selection the brush must still paint everywhere. */
  async 'brush-unclipped'(page) {
    await tool(page, 'Brush');
    await setBrushSize(page, 40);
    await drag(page, [0.1, 0.5], [0.9, 0.5], 40);

    const [left, middle, right] = await samplePixels(page, [
      [0.18, 0.5],
      [0.5, 0.5],
      [0.82, 0.5],
    ]);
    return [left, middle, right].every(isDark)
      ? []
      : ['brush did not paint across the whole layer with no selection active'];
  },

  /**
   * #5 - Alt+right-drag must change the brush size smoothly. The old scheme
   * pinned the OS cursor and swallowed alternate events, so the size lurched
   * back and forth; this samples it along the drag and rejects any reversal.
   */
  async 'brush-resize'(page) {
    await tool(page, 'Brush');
    await setBrushSize(page, 20);

    const box = await canvasBox(page);
    const y = box.y + box.height * 0.5;
    const startX = box.x + box.width * 0.5;

    const readSize = () =>
      page.evaluate(() => {
        const label = [...document.querySelectorAll('aside span')].find((el) =>
          /^Brush \d+px$/.test(el.textContent ?? ''),
        );
        return label ? Number(label.textContent.match(/(\d+)/)[1]) : null;
      });

    await page.mouse.move(startX, y);
    await page.keyboard.down('Alt');
    await page.mouse.down({ button: 'right' });

    const sizes = [];
    for (let i = 1; i <= 12; i += 1) {
      await page.mouse.move(startX + i * 12, y);
      await sleep(60);
      sizes.push(await readSize());
    }

    await page.mouse.up({ button: 'right' });
    await page.keyboard.up('Alt');
    await sleep(200);

    const problems = [];
    if (sizes.some((size) => size === null)) return ['could not read the brush size label'];
    if (sizes[sizes.length - 1] <= sizes[0]) {
      problems.push(`dragging right did not grow the brush (${sizes[0]} -> ${sizes[sizes.length - 1]})`);
    }
    for (let i = 1; i < sizes.length; i += 1) {
      if (sizes[i] < sizes[i - 1]) {
        problems.push(`size went backwards mid-drag: ${sizes.join(', ')}`);
        break;
      }
    }
    return problems;
  },

  /**
   * #11 - Cursor (A) drag inside a selection moves the selected pixels; the
   * region it came from is left empty and the pixels show up further right.
   */
  async 'selection-move-pixels'(page) {
    await tool(page, 'Brush');
    await setBrushSize(page, 60);
    await drag(page, [0.2, 0.5], [0.34, 0.5], 20);

    await tool(page, 'Marquee');
    await drag(page, [0.14, 0.38], [0.4, 0.62]);

    await tool(page, 'Cursor');
    await drag(page, [0.27, 0.5], [0.67, 0.5], 20);
    await sleep(400);

    const [origin, destination] = await samplePixels(page, [
      [0.27, 0.5],
      [0.67, 0.5],
    ]);

    const problems = [];
    if (isDark(origin)) problems.push('pixels were left behind at the original position');
    if (!isDark(destination)) problems.push('pixels did not arrive at the drop position');
    return problems;
  },

  /**
   * #11 - Alt+drag moves only the outline. The painted pixels must stay put,
   * and the moved selection must now clip painting to its new position.
   */
  async 'selection-move-outline'(page) {
    await tool(page, 'Brush');
    await setBrushSize(page, 60);
    await drag(page, [0.2, 0.5], [0.34, 0.5], 20);

    await tool(page, 'Marquee');
    await drag(page, [0.14, 0.38], [0.4, 0.62]);

    await tool(page, 'Cursor');
    const box = await canvasBox(page);
    const at = (p) => [box.x + box.width * p[0], box.y + box.height * p[1]];
    const [x1, y1] = at([0.27, 0.5]);
    const [x2, y2] = at([0.67, 0.5]);
    await page.keyboard.down('Alt');
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    for (let i = 1; i <= 20; i += 1) {
      await page.mouse.move(x1 + ((x2 - x1) * i) / 20, y1 + ((y2 - y1) * i) / 20);
    }
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await sleep(500);

    const [origin] = await samplePixels(page, [[0.27, 0.5]]);
    const problems = [];
    if (!isDark(origin)) problems.push('Alt+drag moved the pixels; it should move only the outline');

    // The outline should now clip painting to where it was dragged.
    await tool(page, 'Brush');
    await drag(page, [0.45, 0.5], [0.9, 0.5], 30);
    const [between, moved] = await samplePixels(page, [
      [0.45, 0.5],
      [0.67, 0.5],
    ]);
    if (isDark(between)) problems.push('paint landed outside the moved selection');
    if (!isDark(moved)) problems.push('paint did not land inside the moved selection');
    return problems;
  },

  /**
   * #9 - Ctrl+X must clear the selected pixels, and Ctrl+V must bring them back
   * as a new layer.
   */
  async 'cut-and-paste'(page) {
    await tool(page, 'Brush');
    await setBrushSize(page, 60);
    await drag(page, [0.2, 0.5], [0.34, 0.5], 20);

    await tool(page, 'Marquee');
    await drag(page, [0.14, 0.38], [0.4, 0.62]);

    const layersBefore = await page.locator('aside ul li').count();

    await page.keyboard.press('Control+x');
    await sleep(900);
    const [afterCut] = await samplePixels(page, [[0.27, 0.5]]);

    await page.keyboard.press('Control+v');
    await sleep(1200);
    const layersAfter = await page.locator('aside ul li').count();

    const problems = [];
    if (isDark(afterCut)) problems.push('Ctrl+X left the pixels in place');
    if (layersAfter <= layersBefore) problems.push('Ctrl+V did not add a layer');
    return problems;
  },
};

/* --------------------------------------------------------------------- main */

async function main() {
  const requested = process.argv.slice(2);
  const names = requested.length ? requested : Object.keys(checks);
  for (const name of names) {
    if (!checks[name]) throw new Error(`Unknown check "${name}". Known: ${Object.keys(checks).join(', ')}`);
  }

  // Vite uses strictPort, so a dev server left running by a previous run would
  // make a second one fail silently. Reuse whatever is already listening.
  const alreadyRunning = await isUp(APP_URL);
  const server = alreadyRunning
    ? null
    : spawn('pnpm', ['dev'], { cwd: REPO_DIR, stdio: 'ignore', shell: process.platform === 'win32' });
  if (alreadyRunning) console.log(`reusing the dev server already on ${APP_URL}`);

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  let failed = 0;
  try {
    await waitForServer(APP_URL);
    for (const name of names) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      await waitForEditor(page);

      let problems;
      try {
        problems = await checks[name](page);
      } catch (error) {
        problems = [`threw: ${error.message}`];
      }
      await context.close();

      if (problems.length) {
        failed += 1;
        console.log(`FAIL  ${name}`);
        for (const problem of problems) console.log(`        ${problem}`);
      } else {
        console.log(`ok    ${name}`);
      }
    }
  } finally {
    await browser.close();
    if (server) {
      if (process.platform === 'win32' && server.pid) {
        spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        server.kill();
      }
    }
  }

  console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${names.length} check(s) passed.`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
