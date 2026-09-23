# Mono

Cool paper / ink themes for Paseo: **Mono Dark** and **Mono Light**. Blue-gray sheet and cool ink — accent, selection, and focus use the foreground color, so chrome stays colorless.

Requires Paseo >= 0.9.1.

On desktop and web, selecting either Mono theme also condenses the top sidebar navigation — **New workspace**, **History**, **Search**, **Schedules**, and any plugin sidebar items — into one icon-only row that follows your configured order. Hovering an icon shows its name; native buttons and accessibility labels remain intact. iOS and Android receive only the color themes.

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

Palettes live in `shared/palette.ts`; Paseo expands each 8-color palette into the full token set. The disposable Web DOM adapter lives in `client/web.ts` and uses Paseo's semantic test IDs rather than visible labels.
