# Mono

Cool paper / ink themes for Paseo: **Mono Dark** and **Mono Light**. Blue-gray sheet and cool ink — accent, selection, and focus use the foreground color, so chrome stays colorless.

Requires Paseo >= 0.9.1.

On desktop and web, selecting either Mono theme also condenses the top sidebar navigation — **New workspace**, **History**, **Search**, **Schedules**, and any plugin sidebar items — into one icon-only row that follows your configured order. Hovering an icon shows its name; native buttons and accessibility labels remain intact. The composer's dictation and voice-mode buttons are hidden as well (keyboard shortcuts still work), and the divider lines at the top and bottom of the left sidebar, at the top of the Explorer, under the center header and tabs, and between the sidebar, center, and Explorer are removed (resizing still works).

On every platform, Mono also hides agent **Thinking** rows from the timeline (via an official timeline transformer). Tool calls and messages are unchanged.

Each tweak is on by default and can be toggled in **Settings → Plugins → mono → Settings**: compact sidebar navigation, hide Thinking, hide the dictation button, and hide the voice mode button. Settings are shared by every client of the same host.

On desktop and web (any theme), each model in **Settings → Providers → _provider_** gets a switch. Turning it off hides that model from the composer model picker and the new-agent model list; turn it back on to restore it. Provider rows in the picker count only visible models. The currently selected model and agent profiles are unaffected.

## Install

```bash
paseo plugin add koinzhang/paseo-plugins --path mono
```

Then pick **Mono Dark** or **Mono Light** in Settings → Appearance.

## Development

```bash
cd mono
npm install
npm run typecheck
npm test
paseo plugin install "$PWD"
paseo plugin reload mono
```

Palettes live in `shared/palette.ts`; Paseo expands each 8-color palette into the full token set. The disposable Web DOM adapters live in `client/web.ts` and `client/model-visibility-web.ts` and use Paseo's semantic test IDs rather than visible labels.
