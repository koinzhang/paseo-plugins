# Mono

Cool paper / ink themes for Paseo: **Mono Dark** and **Mono Light**. Blue-gray sheet and cool ink — accent, selection, and focus use the foreground color, so chrome stays colorless.

Requires Paseo >= 0.9.0.

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

Palettes live in `shared/palette.ts`; Paseo expands each 8-color palette into the full token set.
