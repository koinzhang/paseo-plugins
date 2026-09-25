# Tasks

- [x] Implement physical skill alias merging with provider-native display priority. Verified with symlinked project roots and distinct same-name files in `server/compatibility.test.ts`.
- [x] Detect Cursor and OpenCode third-party compatibility state and apply to scan records. Verified with a local Cursor SQLite fixture, OpenCode environment flag, and snapshot refresh test.
- [x] Add compatibility icon and dynamic “How it loads” copy for relevant providers. Verified by typecheck and mechanism assertions.
- [x] Validate with focused tests, full Customize tests and typecheck; reload plugin. `npm test` passed 39 tests, `npm run typecheck` passed, `paseo plugin reload customize` reported running and logs reported ready.
- [x] Clarify OpenCode automatic skill discovery, ignore foreign manual-only frontmatter, and verify the updated explanation and status. The provider scan test confirmed `disable-model-invocation: true` remains `auto`; all 39 tests and typecheck passed, and Customize reloaded as `running`.
- [x] Use `FolderCog` for the Customize sidebar and Command Center entries; render the existing compatibility icon only for non-null scan compatibility. Verified with 39 tests, typecheck, and a Customize reload reporting `running`.
