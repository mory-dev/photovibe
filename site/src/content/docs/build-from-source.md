---
title: Building from source
description: Set up a Photovibe development environment, run the app, run the tests, and produce your own signed-free build.
order: 6
---

Photovibe is MIT licensed and builds from source on any machine with the Rust and Node
toolchains. The whole repository is at
[github.com/mory-dev/photovibe](https://github.com/mory-dev/photovibe).

## Prerequisites

| Requirement | Notes |
|---|---|
| [Node.js](https://nodejs.org/) 22+ | CI builds on Node 22. |
| [pnpm](https://pnpm.io/) 10 | `npm install -g pnpm` |
| [Rust](https://rustup.rs/) (stable) | Tauri 2 compiles the native shell. |
| Microsoft Visual Studio Build Tools | Windows only, for the MSVC linker. |
| WebView2 runtime | Preinstalled on Windows 11. |

## Run it

```bash
git clone https://github.com/mory-dev/photovibe.git
cd photovibe
pnpm install
pnpm tauri dev
```

The first `pnpm tauri dev` compiles the Rust side and takes a few minutes. After that,
frontend changes hot-reload instantly.

## Scripts

| Command | What it does |
|---|---|
| `pnpm tauri dev` | Run the desktop app with hot reload |
| `pnpm dev` | Run only the frontend in a browser at `localhost:1420` |
| `pnpm build` | Type-check and build the frontend bundle |
| `pnpm test` | Run the Vitest unit tests |
| `pnpm test:watch` | Run the tests in watch mode |
| `pnpm tauri build` | Produce a production desktop build |

Running `pnpm dev` on its own is genuinely useful: the interface is plain web technology,
and Tauri-only calls degrade gracefully, so most of the editor works in a normal browser.
That is exactly how the screenshots on this site are captured.

## How the code is laid out

```
src/
  app/AppShell.tsx          menus, shortcuts, top-level state
  canvas/                   viewport, pointer handling, 2D fallback renderer
  components/               toolbar, inspector, dialogs, options bar
  engine/
    compositor/             WebGL2 compositor and blend-mode shaders
    document/               document + layer model, layer operations
    history/                undo/redo manager
    pixels/                 paint, crop, resize, export, pixel store
    selections/             selection masks and operations
  store/                    Zustand stores: document, editor, viewport
src-tauri/                  Rust shell, native commands, bundling config
site/                       this website
```

The rendering path is worth knowing: `CanvasViewport` composites through the WebGL2
`Compositor`, and falls back to a plain 2D canvas renderer (`drawDocument2D`) if WebGL is
unavailable. Both produce the same picture.

## Tests

```bash
pnpm test
pnpm exec tsc --noEmit
```

These two commands are exactly what CI runs on every push and pull request.

## Building an installer

```bash
pnpm tauri build --bundles nsis
```

The installer lands in `src-tauri/target/release/bundle/nsis/`. A local build is
**unsigned** — code signing happens only in the release workflow, using Azure Trusted
Signing credentials that exist solely in CI. See
[Installing and verifying](/docs/install-and-verify) for why.

## Contributing

Issues and pull requests are welcome at
[github.com/mory-dev/photovibe](https://github.com/mory-dev/photovibe). Please run
`pnpm test` and `pnpm exec tsc --noEmit` before opening a PR — those are the same checks
CI will run.
