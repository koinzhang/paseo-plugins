# Changelog

All notable changes to `@koinzhang/paseo-plugin-mono` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-10-10

Requires Paseo **>= 0.9.0**.

### Fixed

- Keep model visibility switches at the right edge of each provider model row. Long names, IDs, and descriptions use an ellipsis within the remaining space, so they cannot push switches out of view. Custom model delete buttons keep their width beside the switch.

## [0.3.0] - 2026-10-09

Requires Paseo **>= 0.9.0**.

### Added

- Hide the composer context ring while it shows no context data. **Composer → Hide empty context meter** is on by default; turning it off restores the ring. A ring with token data stays visible.

### Fixed

- Hide the lines above and below the left sidebar footer Usage summary when Hide dividers and borders is on. The footer top line stays hidden on Paseo 0.11, which draws it on the footer container instead of the icon row.
- Composer file attachment names and hover paths follow the composer input font size instead of a fixed 14px, and the file-type mark scales down from 18px to that size with its glyph at half. Original inline values are restored when the toggle is off, a pill is removed, or the plugin unloads.

## [0.2.1] - 2026-09-28

Requires Paseo **>= 0.9.0**.

### Fixed

- Prevent Paseo from freezing when opening the draft-agent model picker with Mono installed on multiple connected hosts whose hidden-model settings differ.
- Preserve the host's model-count text nodes, display visible counts through CSS, and coalesce DOM updates per frame. Unloading an instance restores its owned count and accessibility attributes and cancels queued updates.

[Unreleased]: https://github.com/koinzhang/paseo-plugins/compare/mono-v0.3.1...HEAD
[0.3.1]: https://github.com/koinzhang/paseo-plugins/releases/tag/mono-v0.3.1
[0.3.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/mono-v0.3.0
[0.2.1]: https://github.com/koinzhang/paseo-plugins/releases/tag/mono-v0.2.1

## [0.2.0] - 2026-09-28

Requires Paseo **>= 0.9.0**.

### Added

- Composer file attachments show a file-type mark and the filename on desktop and web. Hovering or clicking a workspace file shows its path; long paths keep the first directory and the filename, and the full path stays in the native tooltip.
- New **Composer → Optimize file attachments** switch (on by default). Turning it off restores the host attachment style immediately; deleting, dropping, and Add to chat keep working either way.

[0.2.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/mono-v0.2.0

## [0.1.0] - 2026-09-24

Requires Paseo **>= 0.9.0**.

### Added

- Mono Dark and Mono Light neutral gray themes.
- Configurable compact sidebar navigation, divider and border styling, hidden Thinking rows, and hidden composer voice controls.
- Per-model visibility switches in provider settings for the composer and new-agent model lists.

### Fixed

- Keep the Changes branch toolbar visible and align its background with the Explorer surface.

[0.1.0]: https://github.com/koinzhang/paseo-plugins/releases/tag/mono-v0.1.0
