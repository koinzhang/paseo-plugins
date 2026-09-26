# Changelog

All notable changes to `@koinzhang/paseo-commands` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Requires Paseo **>= 0.9.2**.

### Added

- `/model`, `/effort`, `/profile`, `/mode`, `/feature`, `/rename`, and `/cancel` agent slash commands. Options come from provider capabilities; without an argument, a command opens a picker marking the current value.
- `/resend [text]` agent slash command to resend the latest non-empty user prompt, appending optional text on a new line.
- Settings → Plugins → commands → Settings: turn each slash command on or off, with a short description of what it does.
