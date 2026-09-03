# Photovibe

Local-first desktop photo editor — a Photoshop-lite for prosumers. Built with Tauri 2, React, and a custom WebGL compositing engine.

## Features (in progress)

- Multi-layer editing with blend modes
- Photoshop-like dark UI
- Local-only — no accounts, no cloud
- Windows desktop (v1)

## Development

Requires [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/), and [Rust](https://rustup.rs/).

```bash
pnpm install
pnpm tauri dev
```

### Scripts

| Command | Description |
|---|---|
| `pnpm tauri dev` | Run desktop app in dev mode |
| `pnpm build` | Build frontend |
| `pnpm test` | Run unit tests |
| `pnpm tauri build` | Build production desktop app |

## License

MIT — see [LICENSE](LICENSE).
