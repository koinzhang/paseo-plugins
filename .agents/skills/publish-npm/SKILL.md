---
name: publish-npm
description: >-
  Publish paseo-plugins packages to npm via GitHub Release tags.
  Use when the user asks to release, publish, bump and ship an npm package,
  create an activity-v* tag, or run the Publish workflow.
---

# Publish npm (paseo-plugins)

Canonical human doc: [CONTRIBUTING.md § Publishing to npm](../../../CONTRIBUTING.md#publishing-to-npm).

## Rules

- Publish only through a **published GitHub Release**, not by push-to-`main` alone.
- Tag shape: `{plugin-id}-v{semver}` (Activity: `activity-v0.1.1`).
- Tag semver **must** equal that plugin's `package.json` `version`.
- Do not force-republish an existing npm version; bump again if needed.
- Do not create a release unless the user asked to publish/release (version bump on `main` can land without a tag).

## Activity checklist

Package: `@koinzhang/paseo-plugin-activity` · directory: `activity/` · workflow: `.github/workflows/publish.yml`

1. Confirm `main` is clean enough to release (or use the commit that already bumped version).
2. In `activity/`, bump version if not already bumped:

   ```bash
   npm version patch --no-git-tag-version   # or minor / major
   ```

3. Commit and push to `main` (only if the user asked for the commit / release):

   ```bash
   git add package.json package-lock.json
   git commit -m "chore(activity): release X.Y.Z"
   git push origin main
   ```

4. Tag and create the Release (replace `X.Y.Z`):

   ```bash
   git tag activity-vX.Y.Z
   git push origin activity-vX.Y.Z
   gh release create activity-vX.Y.Z --title "activity X.Y.Z" --generate-notes
   ```

5. Watch the **Publish** Actions run; verify:

   ```bash
   npm view @koinzhang/paseo-plugin-activity version
   ```

## Auth / troubleshooting

- npm auth is **Trusted Publisher** on workflow file `publish.yml` (OIDC). No `NPM_TOKEN` in this repo.
- If publish fails with auth errors: npm package → Trusted Publisher → repo `koinzhang/paseo-plugins`, workflow `publish.yml`, allow `npm publish`.
- If the job is skipped: tag must start with `activity-v`.
- If the job fails at version check: tag and `activity/package.json` version disagree.
