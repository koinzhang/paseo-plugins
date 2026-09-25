# Plan

1. Add a provider-aware post-scan skill alias reducer. Resolve paths with `realpathSync`; leave unresolved files separate. Select a stable representative path and merge the most usable discovery status.
2. Add compatibility metadata to the scan RPC and persisted snapshot. Probe Cursor's local SQLite key read-only, with default-on only for a missing key. Compute OpenCode state from its environment flags.
3. Gate Cursor/OpenCode external skill routes when compatibility is off. Render the leading status icon from non-null scan compatibility metadata and hide it for unsupported providers. Derive mechanism copy from the scan state.
4. Test physical aliases, distinct same-name skills, off switches, snapshot parsing, and dynamic mechanism copy. Run tests and typecheck, then reload Customize.
5. Keep OpenCode's per-skill status `auto` even when a shared skill file carries another provider's `disable-model-invocation` field. State the discovery/body-loading distinction in the mechanism text and cover it with a provider scan test.
