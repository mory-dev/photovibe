# Contributing to Photovibe

Thanks for taking a look. Photovibe is early, which means feedback is worth as much as
code right now.

## Reporting bugs

Open an issue at
[github.com/mory-dev/photovibe/issues](https://github.com/mory-dev/photovibe/issues) with:

- what you did, what you expected, and what happened instead
- your Photovibe version (Help → About Photovibe) and Windows version
- a screenshot if anything looks wrong

Before filing a missing feature, check the
[roadmap](https://photovibe.mory.dev/docs/roadmap) — greyed-out menu items are known gaps,
and a "+1" on the matching issue is more useful than a duplicate.

## Development setup

Requires Node.js 22+, pnpm 10 and Rust (stable). On Windows you also need the Visual Studio
Build Tools for the MSVC linker.

```bash
pnpm install
pnpm tauri dev
```

`pnpm dev` alone runs just the frontend at `localhost:1420`, which is much faster to
iterate on. Tauri-only calls degrade gracefully, so most of the editor works there.

## Before opening a pull request

```bash
pnpm test
pnpm exec tsc --noEmit
```

These are exactly the checks CI runs. Keep changes focused — match the surrounding style
rather than reformatting adjacent code, and avoid mixing unrelated fixes into one PR.

If your change alters the interface, re-capture the website screenshots so the docs do not
go stale:

```bash
cd site && pnpm capture
```

If it enables a menu item that was disabled, move the matching line from `COMING_NEXT` to
`WORKS_TODAY` in `site/src/consts.ts` and update `site/src/content/docs/roadmap.md`.

## Website changes

The site at [photovibe.mory.dev](https://photovibe.mory.dev) lives in `site/` and is a
separate project with its own dependencies. See [docs/website.md](docs/website.md).

## Licence

By contributing, you agree that your contributions are licensed under the
[MIT licence](LICENSE).
