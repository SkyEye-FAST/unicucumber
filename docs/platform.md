# Platform and PWA guide

## Input and clipboard

- One finger uses the active tool. Select and drag inside a selection to move it;
  use the contextual controls to nudge or paste.
- Two fingers zoom and pan without drawing. The Pan tool provides explicit
  one-finger panning, and Fit/reset restores a predictable viewport.
- A pen behaves as a precise pointer; active pen input suppresses accidental
  palm-touch drawing.
- Copy always uses the in-session editor clipboard, which survives tool changes and
  glyph switches until the page session ends. When permitted, the same selection is
  also copied as plain text with a `UNICUCUMBER/1` header followed by `0` and `1`
  pixel rows.

## Browser support

Current stable Chrome/Chromium, Firefox, Safari, Mobile Safari, and Android Chrome
are the support baseline. Pointer Events, ES modules, IndexedDB, and service
workers are expected. Web Share, image clipboard, camera capture, and related
platform APIs are progressively enhanced and always have a core-workflow fallback.

## PWA updates and offline behaviour

Production builds register a service worker with a user-controlled update notice.
Settings displays the application version and includes **Check for updates**. When a
new release is found, the current draft is flushed before the user applies it.

Development intentionally does not register a service worker, so stale cached assets
do not hide local changes. The editor shell works offline after a successful
production load; large optional Unifont and Unicode-name lookup data is not blindly
precached.

Test installation, offline operation, and updates with:

```shell
pnpm build && pnpm preview
```

The Unifont data version is independent from the application version. Release
semantics and version bump rules live in [Versioning](versioning.md).
